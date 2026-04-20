import { randomUUID } from "crypto";
import path from "path";
import { classifyComponent } from "./classification.js";
import { fetchRegistryData } from "./enrichment/npm-provider.js";
import { fetchLocalData } from "./enrichment/local-provider.js";
import { normalizeGitUrl } from "./enrichment/git-provider.js";
import { calculateSha512 } from "../utils/hash.js";

/**
 * Ensure a component has all BSI-required properties (§5.2.2).
 * Mutates the component object in-place.
 * 
 * @param {Object} comp - CycloneDX component object
 * @param {Object} options - Enrichment options
 * @param {string} options.projectRoot - Root of the project being analyzed
 * @returns {Promise<Object>} enriched component object
 */
export async function enrichComponent(comp, options = {}) {
  const { projectRoot = process.cwd() } = options;
  if (!comp.properties) comp.properties = [];

  const setBsiProp = (name, value) => {
    const existing = comp.properties.find((p) => p.name === name);
    if (existing) {
      existing.value = value;
    } else {
      comp.properties.push({ name, value });
    }
  };

  const purl = comp.purl ?? "";
  const isNpm = purl.startsWith("pkg:npm");

  // ── Tiered Enrichment (Registry -> Local -> Git -> Calculated) ────────────
  let registryData = { integrity: null, license: null };
  if (isNpm && comp.name && comp.version) {
    registryData = await fetchRegistryData(comp.name, comp.version);
  }

  let localData = { license: null };
  if (!registryData.license && isNpm && comp.name) {
    localData = await fetchLocalData(projectRoot, comp.name);
  }

  // ── Filename (§5.2.2 "Filename of the component") ─────────────────────────
  // BSI: actual filename (not path). Derive from name + purl ecosystem hint.
  const hasBsiFilename = comp.properties.some((p) => p.name === "bsi:component:filename");
  if (!hasBsiFilename) {
    const purl = comp.purl ?? "";
    let filename = comp.name ?? "unknown";
    if (purl.startsWith("pkg:npm")) filename = `${comp.name}.js`;
    if (purl.startsWith("pkg:pypi")) filename = `${comp.name}.whl`;
    if (purl.startsWith("pkg:maven")) filename = `${comp.name}.jar`;
    if (purl.startsWith("pkg:gem")) filename = `${comp.name}.gem`;
    if (purl.startsWith("pkg:cargo")) filename = `${comp.name}`;
    setBsiProp("bsi:component:filename", filename);
  }

  // ── 5.2.2  Required fields for each component ────────────────────────────
  const classification = classifyComponent(comp);
  setBsiProp("bsi:component:executable", classification.executable);
  setBsiProp("bsi:component:archive", classification.archive);
  setBsiProp("bsi:component:structured", classification.structured);

  // ── Distribution licences (§5.2.2) ────────────────────────────────────────
  // BSI: acknowledgement=concluded  ↔  "distribution licence"
  let foundLicense = registryData.license || localData.license;
  if (!foundLicense && comp.licenses && comp.licenses.length > 0) {
    // If no tiered data, use existing license if present
    foundLicense = comp.licenses[0].expression || comp.licenses[0].license?.id || comp.licenses[0].license?.name;
  }

  if (foundLicense) {
    if (foundLicense === "NOASSERTION") {
       comp.licenses = [{ license: { id: "NOASSERTION" } }];
    } else {
       comp.licenses = [{ expression: foundLicense }];
    }
    // BSI: component:effectiveLicence MUST occur exactly once per component
    setBsiProp("bsi:component:effectiveLicence", foundLicense);
  } else if (!comp.licenses || comp.licenses.length === 0) {
    comp.licenses = [
      {
        license: {
          name: "LicenseRef-ROWE-Unknown",
        },
      },
    ];
    setBsiProp("bsi:component:effectiveLicence", "LicenseRef-ROWE-Unknown");
  } else {
    // Clean up existing licenses
    let effective = "NOASSERTION";
    for (const lic of comp.licenses) {
      if (lic.license) {
        delete lic.license.acknowledgement;
        // Fix names that should be IDs or expressions
        if (lic.license.name === "NOASSERTION") {
          delete lic.license.name;
          lic.license.id = "NOASSERTION";
        }
        effective = lic.license.id || lic.license.name || effective;
      } else if (lic.expression) {
        effective = lic.expression;
      }
    }
    setBsiProp("bsi:component:effectiveLicence", effective);
  }

  // ── Hash SHA-512 of deployable form (§5.2.2) ──────────────────────────────
  // BSI wants it in externalReferences[distribution].hashes
  // Validator checks comp.hashes. We ensure BOTH.

  const isValidHashContent = (content) => {
    if (!content || typeof content !== 'string') return false;
    return /^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$|^[a-fA-F0-9]{96}$|^[a-fA-F0-9]{128}$/.test(content);
  };

  const sriToHex = (sri) => {
    if (!sri || !sri.startsWith('sha512-')) return null;
    try {
      const base64 = sri.replace('sha512-', '');
      return Buffer.from(base64, 'base64').toString('hex');
    } catch {
      return null;
    }
  };

  // 1. Gather any existing SHA-512 hashes from all possible locations
  let sha512Content = null;
  let hashSource = null;

  // Tier 1: Registry SRI
  if (registryData.integrity && registryData.integrity.startsWith('sha512-')) {
    sha512Content = sriToHex(registryData.integrity);
    if (sha512Content) hashSource = 'registry';
  }

  // Fallback: Existing hashes in comp.hashes
  if (!sha512Content) {
    const topSha = (comp.hashes ?? []).find(h => h.alg === "SHA-512");
    if (topSha?.content && isValidHashContent(topSha.content)) {
      sha512Content = topSha.content;
      hashSource = 'existing';
    }
  }

  // Fallback: Existing hashes in externalReferences
  if (!sha512Content && comp.externalReferences) {
    for (const ref of comp.externalReferences) {
      const refSha = (ref.hashes ?? []).find(h => h.alg === "SHA-512");
      if (refSha?.content && isValidHashContent(refSha.content)) {
        sha512Content = refSha.content;
        hashSource = 'existing';
        break;
      }
    }
  }

  // Tier 4: Calculate SHA-512 if missing and we have a path (e.g., local package)
  if (!sha512Content && isNpm && comp.name) {
    const pkgPath = path.join(projectRoot, 'node_modules', comp.name, 'package.json');
    try {
      sha512Content = await calculateSha512(pkgPath);
      hashSource = 'calculated';
    } catch {
      // Ignore calculation errors
    }
  }

  if (hashSource === 'calculated') {
    setBsiProp('bsi:hash-source', 'calculated');
  }

  // 2. Ensure it's in comp.hashes (required by validator)
  if (sha512Content) {
    if (!comp.hashes) comp.hashes = [];
    if (!comp.hashes.some(h => h.alg === "SHA-512")) {
      comp.hashes.push({ alg: "SHA-512", content: sha512Content });
    }
  }

  // 3. Ensure it's in externalReferences[distribution] (required by BSI mapping)
  if (!comp.externalReferences) comp.externalReferences = [];

  // Tier 3: VCS / Source URL normalization
  const vcsRef = comp.externalReferences.find(r => r.type === 'vcs' || r.type === 'source');
  let browseUrl = null;
  if (vcsRef?.url) {
    const gitInfo = normalizeGitUrl(vcsRef.url);
    browseUrl = gitInfo.browse;
  }

  const purlPkg = (comp.purl ?? "").replace(/\?.*$/, "");  // strip qualifiers
  const distUrl = browseUrl || (purlPkg.startsWith("pkg:npm")
    ? `https://registry.npmjs.org/${comp.name}/-/${comp.name}-${comp.version ?? "0.0.0"}.tgz`
    : purlPkg.startsWith("pkg:maven")
      ? `https://repo1.maven.org/maven2/${(comp.group ?? "").replace(/\./g, "/")}/${comp.name}/${comp.version ?? "0.0.0"}/${comp.name}-${comp.version ?? "0.0.0"}.jar`
      : purlPkg.startsWith("pkg:pypi")
        ? `https://pypi.org/project/${comp.name}/${comp.version ?? ""}/`
        : "https://example.com/NOASSERTION");

  let distRef = comp.externalReferences.find((r) => r.type === "distribution");
  if (!distRef) {
    distRef = { type: "distribution", url: distUrl };
    comp.externalReferences.push(distRef);
  } else if (!distRef.url) {
    distRef.url = distUrl;
  }

  if (sha512Content) {
    if (!distRef.hashes) distRef.hashes = [];
    if (!distRef.hashes.some(h => h.alg === "SHA-512")) {
      distRef.hashes.push({ alg: "SHA-512", content: sha512Content });
    }
  }

  // Final cleanup of invalid hashes (from cdxgen or other sources)
  if (comp.hashes) {
    comp.hashes = comp.hashes.filter(h => isValidHashContent(h.content));
    if (comp.hashes.length === 0) delete comp.hashes;
  }
  for (const ref of comp.externalReferences) {
    if (ref.hashes) {
      ref.hashes = ref.hashes.filter(h => isValidHashContent(h.content));
      if (ref.hashes.length === 0) delete ref.hashes;
    }
  }

  // ── Component creator (§5.2.2) ─────────────────────────────────────────────
  // BSI: email or URL. cdxgen may already populate manufacturer/supplier.
  // CycloneDX 1.6: manufacturer is an organizationalEntity object, not an array
  // Derive from purl homepage or leave as NOASSERTION placeholder.
  if (!comp.manufacturer || (Array.isArray(comp.manufacturer) && comp.manufacturer.length === 0) || typeof comp.manufacturer !== 'object') {
    const purlPkg = (comp.purl ?? "").replace(/\?.*$/, "");  // strip qualifiers
    const repoHost = purlPkg.startsWith("pkg:npm")
      ? `https://www.npmjs.com/package/${comp.name}`
      : purlPkg.startsWith("pkg:maven")
        ? `https://mvnrepository.com/artifact/${comp.group ?? ""}/${comp.name}`
        : purlPkg.startsWith("pkg:pypi")
          ? `https://pypi.org/project/${comp.name}`
          : null;

    if (repoHost) {
      comp.manufacturer = { url: [repoHost] };  // CycloneDX 1.6: url must be array
    } else {
      comp.manufacturer = { name: "NOASSERTION" };
    }
  } else if (Array.isArray(comp.manufacturer)) {
    // Convert array to single object (take first entry)
    comp.manufacturer = comp.manufacturer[0] ?? { name: "NOASSERTION" };
  }

  // Ensure manufacturer.url is always an array (CycloneDX 1.6 requirement)
  if (comp.manufacturer?.url && !Array.isArray(comp.manufacturer.url)) {
    comp.manufacturer.url = [comp.manufacturer.url];
  }

  // ── Component version (§5.2.2) ─────────────────────────────────────────────
  // cdxgen always fills this; guard for edge cases
  if (!comp.version) {
    comp.version = "NOASSERTION";
  }

  // ── Fix evidence.identity format (CycloneDX 1.6 schema change) ─────────────
  // CycloneDX 1.6 changed evidence.identity from array to object
  // cdxgen may still produce array format - convert to object
  if (comp.evidence?.identity) {
    if (Array.isArray(comp.evidence.identity)) {
      // Take the first element as the identity object
      comp.evidence.identity = comp.evidence.identity[0] ?? null;
      if (!comp.evidence.identity) {
        delete comp.evidence.identity;
      }
    }
    // Remove identity if it's empty or invalid
    if (comp.evidence.identity && typeof comp.evidence.identity !== 'object') {
      delete comp.evidence.identity;
    }
  }

  return comp;
}

/**
 * Enriches a full SBOM to BSI TR-03183-2 v2.1.0 compliance.
 * 
 * @param {Object} sbom - CycloneDX SBOM object
 * @param {Object} options - Enrichment options
 * @param {string} options.creatorEmail - SBOM creator email
 * @param {string} options.creatorUrl - SBOM creator URL
 * @param {string} options.projectRoot - Root of the project being analyzed
 * @returns {Promise<Object>} enriched SBOM object
 */
export async function enrichSbom(sbom, options = {}) {
  const { 
    creatorEmail = "Simon.Kaempflein@rowe.de", 
    creatorUrl = "https://www.rowe.de/",
    projectRoot = process.cwd()
  } = options;

  // ── 5.2.1 Required fields for the SBOM itself ────────────────────────────────

  // Clean up metadata
  if (sbom.metadata) {
    delete sbom.metadata.tools;
    delete sbom.metadata.lifecycles;
  }
  delete sbom.annotations;

  // serialNumber → SBOM-URI (§5.2.3)
  if (!sbom.serialNumber) {
    sbom.serialNumber = `urn:uuid:${randomUUID()}`;
  }

  // metadata.timestamp (§5.2.1)
  if (!sbom.metadata) sbom.metadata = {};
  sbom.metadata.timestamp = new Date().toISOString();

  // metadata.manufacturer → Creator of the SBOM (§5.2.1)
  const sbomCreator = creatorEmail
    ? { contact: [{ email: creatorEmail }] }
    : { name: "SBOM Creator", url: [creatorUrl] };

  sbom.metadata.manufacturer = sbomCreator;

  // Ensure specVersion is 1.6+
  sbom.specVersion = "1.6";

  // ── 5.2.2 Required fields for each component ─────────────────────────────────

  // Enrich primary component (metadata.component)
  if (sbom.metadata?.component) {
    await enrichComponent(sbom.metadata.component, { projectRoot });
  }

  // Enrich all listed components
  if (Array.isArray(sbom.components)) {
    for (let i = 0; i < sbom.components.length; i++) {
      await enrichComponent(sbom.components[i], { projectRoot });
    }
  }

  // ── Dependency graph completeness (§5.2.2 + §5.1) ────────────────────────────
  if (!Array.isArray(sbom.dependencies)) sbom.dependencies = [];

  const depsIndex = new Set(sbom.dependencies.map((d) => d.ref));

  function ensureInDepsGraph(comp) {
    if (comp?.["bom-ref"] && !depsIndex.has(comp["bom-ref"])) {
      sbom.dependencies.push({ ref: comp["bom-ref"], dependsOn: [] });
      depsIndex.add(comp["bom-ref"]);
    }
  }

  (sbom.components ?? []).forEach(ensureInDepsGraph);
  if (sbom.metadata?.component) ensureInDepsGraph(sbom.metadata.component);

  // ── compositions: mark dependency completeness (§5.2.2) ──────────────────────
  if (!Array.isArray(sbom.compositions)) sbom.compositions = [];
  const hasComposition = sbom.compositions.length > 0;
  if (!hasComposition && sbom.metadata?.component?.["bom-ref"]) {
    sbom.compositions.push({
      aggregate: "incomplete",
      assemblies: [sbom.metadata.component["bom-ref"]],
    });
  }

  return sbom;
}
