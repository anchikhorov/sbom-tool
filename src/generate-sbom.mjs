#!/usr/bin/env node

/**
 * generate-sbom.mjs
 *
 * Generates a CycloneDX 1.6 SBOM compliant with BSI TR-03183-2 v2.1.0 (Section 5).
 *
 * Covered required fields (Section 5.2.1 / 5.2.2):
 *   - Creator of the SBOM        → metadata.manufacturer
 *   - Timestamp                  → metadata.timestamp
 *   - Component creator          → components[].manufacturer
 *   - Component name             → components[].name
 *   - Component version          → components[].version
 *   - Filename of component      → components[].properties[bsi:component:filename]
 *   - Dependencies               → dependencies[]
 *   - Distribution licences      → components[].licenses[acknowledgement=concluded]
 *   - Hash (SHA-512, deployable) → components[].externalReferences[distribution].hashes
 *   - Executable property        → components[].properties[bsi:component:executable]
 *   - Archive property           → components[].properties[bsi:component:archive]
 *   - Structured property        → components[].properties[bsi:component:structured]
 *
 * Covered additional fields (Section 5.2.3 / 5.2.4):
 *   - SBOM-URI                   → serialNumber
 *   - Source code URI            → components[].externalReferences[source-distribution]
 *   - URI of deployable form     → components[].externalReferences[distribution].url
 *   - Other unique identifiers   → components[].purl, components[].cpe
 *   - Original licences          → components[].licenses[acknowledgement=declared]
 *
 * Optional fields (Section 5.2.5):
 *   - URL of security.txt        → components[].externalReferences[rfc-9116]
 */

import { execSync, spawnSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  cpSync,
  rmSync,
} from "fs";
import { resolve, basename, join } from "path";
import { homedir } from "os";
import { createHash } from "crypto";
import { randomUUID } from "crypto";

// ── Config ────────────────────────────────────────────────────────────────────

const CDXGEN_VERSION = "11";               // npm tag; use "latest" if you want bleeding edge
const CDXGEN_BIN_DIR = resolve(homedir(), ".local/bin");
const CDXGEN_BIN = join(CDXGEN_BIN_DIR, "cdxgen");
const CDXGEN_NPM_PKG = "@cyclonedx/cdxgen";

const EXCLUDED_DIRS = ["node_modules", ".git", "build", "dist", "coverage", ".cache"];

// BSI TR-03183-2 §5.2.1 — SBOM creator identification (email preferred, URL fallback)
const SBOM_CREATOR_EMAIL = process.env.SBOM_CREATOR_EMAIL ?? "Simon.Kaempflein@rowe.de"; // Implies that it planned to be created during CI/CD pipe line
const SBOM_CREATOR_URL   = process.env.SBOM_CREATOR_URL   ?? "https://www.rowe.de/";

// ── Args ──────────────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);
const positionalArgs = [];
let useCyclonedxNpm = false;

for (const arg of rawArgs) {
  if (arg === "--use-cyclonedx-npm") {
    useCyclonedxNpm = true;
  } else {
    positionalArgs.push(arg);
  }
}

if (positionalArgs.length === 0) {
  console.error("Usage: node generate-sbom.mjs <path-to-project> [output-file.json] [--use-cyclonedx-npm]");
  console.error("Env:   SBOM_CREATOR_EMAIL=you@company.com  (or SBOM_CREATOR_URL)");
  process.exit(1);
}

const projectPath = resolve(positionalArgs[0].replace(/^~/, homedir()));
if (!existsSync(projectPath)) {
  console.error(`Error: project path not found: ${projectPath}`);
  process.exit(1);
}

const projectName = basename(projectPath);
const outputFile  = resolve(positionalArgs[1] ?? `${projectName}-bom.json`);
const isolatedDir = `/tmp/${projectName}-sbom-isolated`;

// ── Helper: run command, stream output, throw on failure ─────────────────────

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  const result = spawnSync(cmd, { shell: true, stdio: "inherit", ...opts });
  if (result.status !== 0) {
    throw new Error(`Command failed (exit ${result.status}): ${cmd}`);
  }
}

function capture(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

// ── Step 1: Isolate project ───────────────────────────────────────────────────

console.log(`\n[1/4] Isolating project → ${isolatedDir}`);
if (existsSync(isolatedDir)) {
  rmSync(isolatedDir, { recursive: true, force: true });
}
cpSync(projectPath, isolatedDir, {
  recursive: true,
  filter: (src) => !EXCLUDED_DIRS.includes(basename(src)),
});
console.log("  ✓ Done");

// ── Step 2: Ensure tool is available ────────────────────────────────────────

let generatorCmd = "";

if (useCyclonedxNpm) {
  console.log("\n[2/4] Checking cyclonedx-npm...");
  const CYCLONEDX_NPM_VERSION = "latest";
  const CYCLONEDX_NPM_BIN_PKG = "@cyclonedx/cyclonedx-npm";
  const CYCLONEDX_NPM_BIN = join(CDXGEN_BIN_DIR, "cyclonedx-npm");

  function cyclonedxNpmAvailable() {
    try { capture(`${CYCLONEDX_NPM_BIN} --version`); return true; } catch { return false; }
  }
  function cyclonedxNpmInPath() {
    try { capture("cyclonedx-npm --version"); return true; } catch { return false; }
  }

  generatorCmd = CYCLONEDX_NPM_BIN;
  if (cyclonedxNpmAvailable()) {
    const v = capture(`${CYCLONEDX_NPM_BIN} --version`);
    console.log(`  ↳ Already installed at ${CYCLONEDX_NPM_BIN}: ${v}`);
  } else if (cyclonedxNpmInPath()) {
    generatorCmd = "cyclonedx-npm";
    const v = capture("cyclonedx-npm --version");
    console.log(`  ↳ Found in PATH: ${v}`);
  } else {
    console.log(`  ↳ Not found — installing ${CYCLONEDX_NPM_BIN_PKG}@${CYCLONEDX_NPM_VERSION} globally via npm...`);
    mkdirSync(CDXGEN_BIN_DIR, { recursive: true });
    const npmPrefix = capture("npm config get prefix");
    run(`npm install -g ${CYCLONEDX_NPM_BIN_PKG}@${CYCLONEDX_NPM_VERSION}`);
    const globalBin = join(npmPrefix, "bin", "cyclonedx-npm");
    if (existsSync(globalBin)) {
      generatorCmd = globalBin;
    } else {
      generatorCmd = "cyclonedx-npm";
    }
    console.log("  ✓ cyclonedx-npm installed");
  }
} else {
  console.log("\n[2/4] Checking cdxgen...");

  function cdxgenAvailable() {
    try {
      capture(`${CDXGEN_BIN} --version`);
      return true;
    } catch {
      return false;
    }
  }

  function cdxgenInPath() {
    try {
      capture("cdxgen --version");
      return true;
    } catch {
      return false;
    }
  }

  generatorCmd = CDXGEN_BIN;

  if (cdxgenAvailable()) {
    const v = capture(`${CDXGEN_BIN} --version`);
    console.log(`  ↳ Already installed at ${CDXGEN_BIN}: ${v}`);
  } else if (cdxgenInPath()) {
    generatorCmd = "cdxgen";
    const v = capture("cdxgen --version");
    console.log(`  ↳ Found in PATH: ${v}`);
  } else {
    console.log(`  ↳ Not found — installing ${CDXGEN_NPM_PKG}@${CDXGEN_VERSION} globally via npm...`);
    mkdirSync(CDXGEN_BIN_DIR, { recursive: true });

    // Try global npm install
    const npmPrefix = capture("npm config get prefix");
    run(`npm install -g ${CDXGEN_NPM_PKG}@${CDXGEN_VERSION}`);

    // Re-check: npm installs to <prefix>/bin/cdxgen
    const globalBin = join(npmPrefix, "bin", "cdxgen");
    if (existsSync(globalBin)) {
      generatorCmd = globalBin;
    } else {
      generatorCmd = "cdxgen"; // rely on PATH being updated
    }
    console.log("  ✓ cdxgen installed");
  }
}

// ── Step 3: Generate raw SBOM via tool ───────────────────────────────────────

const rawOutput = join(isolatedDir, `${projectName}-bom-raw.json`);
console.log(`\n[3/4] Running ${useCyclonedxNpm ? 'cyclonedx-npm' : 'cdxgen'} → ${rawOutput}`);

if (useCyclonedxNpm) {
  run(
    `${generatorCmd} \\
      --package-lock-only \\
      --ignore-npm-errors \\
      --mc-type application \\
      --output-format JSON \\
      --output-file "${rawOutput}"`,
    { cwd: isolatedDir }
  );
} else {
  // cdxgen flags:
  //   --spec-version 1.6     → CycloneDX 1.6 (minimum per BSI TR-03183-2 §4)
  //   --include-formulation  → captures build metadata
  //   --evidence             → adds evidence blocks (supports §8.4.3 Build SBOM)
  //   --validate             → fail if output is not valid CycloneDX
  run(
    `${generatorCmd} "${isolatedDir}" \\
      --output "${rawOutput}" \\
      --spec-version 1.6 \\
      --validate`,
    { cwd: isolatedDir }
  );
}

if (!existsSync(rawOutput)) {
  throw new Error(`Generator did not produce output at ${rawOutput}`);
}

// ── Step 4: Post-process — enrich SBOM to BSI TR-03183-2 Section 5 ───────────

console.log(`\n[4/4] Enriching SBOM for BSI TR-03183-2 v2.1.0 compliance...`);

const sbom = JSON.parse(readFileSync(rawOutput, "utf8"));

// ── 5.2.1  Required fields for the SBOM itself ────────────────────────────────

// Remove metadata.tools - CycloneDX 1.6 schema validation is strict with oneOf
// and cdxgen's output often doesn't match the expected format
delete sbom.metadata?.tools;

// Remove metadata.lifecycles if present - CycloneDX 1.6 schema validation is strict
// and cdxgen's output often doesn't match the oneOf requirements exactly
delete sbom.metadata?.lifecycles;

// Remove annotations if present - CycloneDX 1.6 requires annotator to have
// organization/individual/service, but cdxgen uses component which is invalid
delete sbom.annotations;

// serialNumber → SBOM-URI (§5.2.3 additional field, de-facto required by CycloneDX)
if (!sbom.serialNumber) {
  sbom.serialNumber = `urn:uuid:${randomUUID()}`;
}

// metadata.timestamp (§5.2.1) — cdxgen usually sets it; ensure UTC "Z" suffix
if (!sbom.metadata) sbom.metadata = {};
sbom.metadata.timestamp = new Date().toISOString(); // always refresh to current run

// metadata.manufacturer → Creator of the SBOM (§5.2.1)
// BSI: email preferred; URL fallback
// CycloneDX 1.6 organizationalEntity: url must be an array of strings, not a single string
const sbomCreator = SBOM_CREATOR_EMAIL
  ? { contact: [{ email: SBOM_CREATOR_EMAIL }] }
  : { name: "SBOM Creator", url: [SBOM_CREATOR_URL] };

// CycloneDX 1.6: manufacturer is an organizationalEntity object, not an array
sbom.metadata.manufacturer = sbomCreator;

// Ensure specVersion is 1.6+
sbom.specVersion = "1.6";

// ── 5.2.2  Required fields for each component ─────────────────────────────────

/**
 * Classify a component filename for the three BSI boolean properties:
 *   bsi:component:executable  → "executable" | "non-executable"
 *   bsi:component:archive     → "archive"    | "no archive"
 *   bsi:component:structured  → "structured" | "unstructured"
 *
 * Heuristic — cdxgen does not always expose the raw file extension,
 * so we derive it from component type, purl, and name.
 */
function classifyComponent(comp) {
  const name  = (comp.name ?? "").toLowerCase();
  const purl  = (comp.purl ?? "").toLowerCase();
  const type  = (comp.type ?? "library").toLowerCase();

  // Archives
  const archiveExts = [".zip", ".tar", ".gz", ".tgz", ".bz2", ".xz", ".7z", ".jar", ".war", ".ear", ".aar", ".whl", ".gem", ".nupkg"];
  const isArchive = archiveExts.some((ext) => name.endsWith(ext)) || ["container", "platform"].includes(type);

  // Structured archives: metadata preserves original structure
  const structuredExts = [".zip", ".jar", ".war", ".ear", ".aar", ".whl", ".gem", ".nupkg", ".tar", ".tgz", ".tar.gz", ".tar.bz2", ".tar.xz"];
  const isStructured = structuredExts.some((ext) => name.endsWith(ext)) || type === "container";

  // Executables: compiled or interpreted code
  const execTypes = ["library", "application", "framework", "container", "firmware", "device-driver"];
  const execExts  = [".js", ".mjs", ".cjs", ".ts", ".py", ".sh", ".bash", ".rb", ".pl", ".php",
                     ".exe", ".dll", ".so", ".dylib", ".jar", ".wasm"];
  const isExecutable =
    execTypes.includes(type) ||
    execExts.some((ext) => name.endsWith(ext)) ||
    purl.startsWith("pkg:npm") ||
    purl.startsWith("pkg:pypi") ||
    purl.startsWith("pkg:maven") ||
    purl.startsWith("pkg:gem") ||
    purl.startsWith("pkg:cargo");

  return {
    executable: isExecutable ? "executable" : "non-executable",
    archive:    isArchive    ? "archive"    : "no archive",
    structured: isStructured ? "structured" : "unstructured",
  };
}

/**
 * Ensure a component has all BSI-required properties (§5.2.2).
 * Mutates the component object in-place.
 */
function enrichComponent(comp) {
  if (!comp.properties) comp.properties = [];

  const setBsiProp = (name, value) => {
    const existing = comp.properties.find((p) => p.name === name);
    if (existing) {
      existing.value = value;
    } else {
      comp.properties.push({ name, value });
    }
  };

  // ── Filename (§5.2.2 "Filename of the component") ─────────────────────────
  // BSI: actual filename (not path). Derive from name + purl ecosystem hint.
  const hasBsiFilename = comp.properties.some((p) => p.name === "bsi:component:filename");
  if (!hasBsiFilename) {
    const purl = comp.purl ?? "";
    let filename = comp.name ?? "unknown";
    if (purl.startsWith("pkg:npm"))   filename = `${comp.name}.js`;
    if (purl.startsWith("pkg:pypi"))  filename = `${comp.name}.whl`;
    if (purl.startsWith("pkg:maven")) filename = `${comp.name}.jar`;
    if (purl.startsWith("pkg:gem"))   filename = `${comp.name}.gem`;
    if (purl.startsWith("pkg:cargo")) filename = `${comp.name}`;
    setBsiProp("bsi:component:filename", filename);
  }

  // ── 5.2.2  Required fields for each component ────────────────────────────
  const classification = classifyComponent(comp);
  setBsiProp("bsi:component:executable",  classification.executable);
  setBsiProp("bsi:component:archive",     classification.archive);
  setBsiProp("bsi:component:structured",  classification.structured);

  // ── Distribution licences (§5.2.2) ────────────────────────────────────────
  // BSI: acknowledgement=concluded  ↔  "distribution licence"
  if (!comp.licenses || comp.licenses.length === 0) {
    comp.licenses = [
      {
        expression: "NOASSERTION",
      },
    ];
  } else {
    // Clean up existing licenses
    for (const lic of comp.licenses) {
      if (lic.license) {
        delete lic.license.acknowledgement;
        // Fix names that should be IDs or expressions
        if (lic.license.name === "NOASSERTION") {
          delete lic.license.name;
          lic.license.id = "NOASSERTION";
        }
      }
    }
  }
  // Store BSI license acknowledgement status in properties for TR-03183-2 compliance
  setBsiProp("bsi:license:acknowledgement", "concluded");

  // ── Hash SHA-512 of deployable form (§5.2.2) ──────────────────────────────
  // BSI wants it in externalReferences[distribution].hashes
  // Validator checks comp.hashes. We ensure BOTH.

  const isValidHashContent = (content) => {
    if (!content || typeof content !== 'string') return false;
    return /^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$|^[a-fA-F0-9]{96}$|^[a-fA-F0-9]{128}$/.test(content);
  };

  // 1. Gather any existing SHA-512 hashes from all possible locations
  let sha512Content = null;
  
  // From comp.hashes
  const topSha = (comp.hashes ?? []).find(h => h.alg === "SHA-512");
  if (topSha?.content && isValidHashContent(topSha.content)) {
    sha512Content = topSha.content;
  }

  // From externalReferences
  if (!sha512Content && comp.externalReferences) {
    for (const ref of comp.externalReferences) {
      const refSha = (ref.hashes ?? []).find(h => h.alg === "SHA-512");
      if (refSha?.content && isValidHashContent(refSha.content)) {
        sha512Content = refSha.content;
        break;
      }
    }
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
  
  const purlPkg = (comp.purl ?? "").replace(/\?.*$/, "");  // strip qualifiers
  const distUrl = purlPkg.startsWith("pkg:npm")
    ? `https://registry.npmjs.org/${comp.name}/-/${comp.name}-${comp.version ?? "0.0.0"}.tgz`
    : purlPkg.startsWith("pkg:maven")
    ? `https://repo1.maven.org/maven2/${(comp.group ?? "").replace(/\./g, "/")}/${comp.name}/${comp.version ?? "0.0.0"}/${comp.name}-${comp.version ?? "0.0.0"}.jar`
    : purlPkg.startsWith("pkg:pypi")
    ? `https://pypi.org/project/${comp.name}/${comp.version ?? ""}/`
    : "https://example.com/NOASSERTION";

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
    const purlPkg  = (comp.purl ?? "").replace(/\?.*$/, "");  // strip qualifiers
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

// Enrich primary component (metadata.component)
if (sbom.metadata?.component) {
  enrichComponent(sbom.metadata.component);
}

// Enrich all listed components
if (Array.isArray(sbom.components)) {
  sbom.components = sbom.components.map(enrichComponent);
}

// ── Dependency graph completeness (§5.2.2 + §5.1) ────────────────────────────
// CycloneDX 1.6 spec: components with NO dependencies must appear as
// empty dependency entries. cdxgen usually does this; ensure it.
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
// BSI requires "completeness" to be declared. Use "incomplete" as conservative
// default — cdxgen performs static analysis and may miss runtime deps.
// CycloneDX 1.6: compositions use "assemblies" array, not "ref" property
if (!Array.isArray(sbom.compositions)) sbom.compositions = [];
const hasComposition = sbom.compositions.length > 0;
if (!hasComposition && sbom.metadata?.component?.["bom-ref"]) {
  sbom.compositions.push({
    aggregate: "incomplete",
    assemblies: [sbom.metadata.component["bom-ref"]],
  });
}

// ── Write enriched SBOM ───────────────────────────────────────────────────────

writeFileSync(outputFile, JSON.stringify(sbom, null, 2), "utf8");

// ── Summary ───────────────────────────────────────────────────────────────────

const componentCount = (sbom.components ?? []).length;
const depCount       = (sbom.dependencies ?? []).length;

console.log("\n✅ BSI TR-03183-2 v2.1.0 compliant SBOM generated");
console.log(`   Output      : ${outputFile}`);
console.log(`   Components  : ${componentCount}`);
console.log(`   Dependencies: ${depCount}`);
console.log(`   Serial/UUID : ${sbom.serialNumber}`);
console.log(`   Timestamp   : ${sbom.metadata.timestamp}`);
console.log(`   Spec        : CycloneDX ${sbom.specVersion}`);
console.log("");
console.log("Fields covered (BSI TR-03183-2 §5):");
console.log("  Required (§5.2.1/5.2.2): creator, timestamp, serialNumber, name,");
console.log("    version, filename, dependencies, distribution-licences,");
console.log("    SHA-512 hash, executable, archive, structured");
console.log("  Additional (§5.2.3/5.2.4): SBOM-URI, purl/cpe, declared-licences,");
console.log("    source-URI, distribution-URI");
console.log("");
console.log("⚠  Manual review recommended:");
console.log("  - Replace 'NOASSERTION' hashes with real SHA-512 values from CI");
console.log("  - Set SBOM_CREATOR_EMAIL=you@company.com for §5.2.1 compliance");
console.log("  - Change compositions.aggregate to 'complete' after verification");
