import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename, dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { enrichSbom } from '../core/enrichment.js';
import { validateSbom } from '../core/validation.js';
import { loadConfig } from '../utils/config.js';
import { checkCdxgen, installCdxgen, checkCyclonedxNpm, installCyclonedxNpm } from '../utils/preflight.js';
import { prepareIsolation, cleanupIsolation } from '../utils/isolation.js';
import { DISCLAIMER } from '../utils/disclaimer.js';

/**
 * Executes a command and streams output.
 * @param {string} cmd Command to run.
 * @param {object} opts spawnSync options.
 */
function run(cmd, opts = {}) {
  const result = spawnSync(cmd, { shell: true, stdio: "inherit", ...opts });
  if (result.status !== 0) {
    throw new Error(`Command failed (exit ${result.status}): ${cmd}`);
  }
}

/**
 * Action for the generate command.
 * @param {string} projectPath Path to the project.
 * @param {object} options Command options.
 */
export async function generateAction(projectPath, options) {
  const config = loadConfig();
  const absProjectPath = resolve(projectPath.replace(/^~/, homedir()));
  
  if (!existsSync(absProjectPath)) {
    console.error(`\n❌ Error: project path not found: ${absProjectPath}`);
    process.exit(1);
  }

  const projectName = basename(absProjectPath);
  // Default output goes to the parent of the tool's install directory
  // (i.e. parent of where sbom.config.json lives), so SBOMs land alongside
  // the generate-sbom/ folder rather than inside it.
  const outputFile = options.output
    ? resolve(options.output)
    : resolve(dirname(config.configDir), `${projectName}-bom.json`);
  let isolatedPath = null;

  try {
    let rawOutput;

    if (config.useCyclonedxNpm) {
      // 1. Pre-flight: Ensure cyclonedx-npm
      console.log("\n[1/5] Pre-flight: Checking cyclonedx-npm...");
      let npmPath = await checkCyclonedxNpm();
      if (!npmPath) {
        console.log("cyclonedx-npm not found. Installing...");
        const success = await installCyclonedxNpm();
        if (!success) {
          throw new Error("Failed to install cyclonedx-npm.");
        }
        npmPath = await checkCyclonedxNpm();
      }
      console.log(`Using cyclonedx-npm at: ${npmPath}`);

      // 2. Isolation: Create manifest-only workspace
      console.log(`\n[2/5] Isolation: Creating manifest-only workspace...`);
      const isolation = prepareIsolation(absProjectPath);
      isolatedPath = isolation.isolatedPath;
      console.log(`Isolated workspace: ${isolatedPath}`);

      // 3. Generation: Run cyclonedx-npm
      rawOutput = join(isolatedPath, `${projectName}-bom-raw.json`);
      console.log(`\n[3/5] Generation: Running cyclonedx-npm → ${rawOutput}`);
      run(
        `"${npmPath}" \\
          --package-lock-only \\
          --ignore-npm-errors \\
          --mc-type application \\
          --output-format JSON \\
          --output-file "${rawOutput}"`,
        { cwd: isolatedPath }
      );
    } else {
      // 1. Pre-flight: Ensure cdxgen
      console.log("\n[1/5] Pre-flight: Checking cdxgen...");
      let cdxgenPath = await checkCdxgen();
      if (!cdxgenPath) {
        console.log("cdxgen not found. Installing...");
        const success = await installCdxgen();
        if (!success) {
          throw new Error("Failed to install cdxgen.");
        }
        cdxgenPath = await checkCdxgen();
      }
      console.log(`Using cdxgen at: ${cdxgenPath}`);

      // 2. Isolation: Create manifest-only workspace
      console.log(`\n[2/5] Isolation: Creating manifest-only workspace...`);
      const isolation = prepareIsolation(absProjectPath);
      isolatedPath = isolation.isolatedPath;
      console.log(`Isolated workspace: ${isolatedPath}`);

      // 3. Generation: Run cdxgen
      rawOutput = join(isolatedPath, `${projectName}-bom-raw.json`);
      console.log(`\n[3/5] Generation: Running cdxgen → ${rawOutput}`);
      run(
        `"${cdxgenPath}" \\
          --output "${rawOutput}" \\
          --spec-version ${config.specVersion} \\
          --validate`,
        { cwd: isolatedPath }
      );
    }

    if (!existsSync(rawOutput)) {
      throw new Error(`Generator did not produce output at ${rawOutput}`);
    }

    // 4. Enrichment: Apply tiered enrichment loop
    console.log(`\n[4/5] Enrichment: Applying BSI TR-03183-2 attribute mapping...`);
    const rawSbom = JSON.parse(readFileSync(rawOutput, "utf8"));
    const enrichedSbom = await enrichSbom(rawSbom, {
      creatorEmail: config.creatorEmail,
      creatorUrl: config.creatorUrl,
      projectRoot: absProjectPath,
      privatePackages: config.privatePackages
    });
    // ── 4b. Completeness Check (BSI §5.2.2 compositions) ────────────────────────
    // BSI TR-03183-2 requires a `compositions` block declaring whether the SBOM
    // is "complete" or "incomplete". Instead of blindly hardcoding "incomplete",
    // we perform an automated set-containment check:
    //
    //   1. Run `npm ls --all --parseable --package-lock-only` to get every
    //      package the lockfile knows about (works without node_modules).
    //   2. Extract unique package names (deduplicating hoisted paths).
    //   3. Build a set of all component names present in the SBOM.
    //   4. Check that EVERY lockfile package exists in the SBOM set.
    //
    // "complete" = 0 missing packages (100% coverage).
    // The SBOM is allowed to contain MORE components than the lockfile
    // (e.g., bundled deps, optional platform deps resolved by cdxgen).
    //
    // We check production deps first (--omit=dev), since most generators
    // exclude devDependencies. If all production deps are found → "complete".
    // If any are missing, we report them by name for easy debugging.
    // ────────────────────────────────────────────────────────────────────────────
    console.log(`\n[4b/5] Completeness: Verifying dependency coverage...`);
    try {
      // Helper: run npm ls with fallback (--package-lock-only first, then regular)
      const runNpmLs = (extraArgs = []) => {
        const result = spawnSync('npm', ['ls', '--all', '--parseable', '--package-lock-only', ...extraArgs], {
          cwd: absProjectPath,
          stdio: 'pipe',
          encoding: 'utf8',
          timeout: 30000
        });
        if (!result.stdout || result.stdout.trim().split('\n').filter(Boolean).length <= 1) {
          // Fallback: try without --package-lock-only (needs node_modules)
          return spawnSync('npm', ['ls', '--all', '--parseable', ...extraArgs], {
            cwd: absProjectPath,
            stdio: 'pipe',
            encoding: 'utf8',
            timeout: 30000
          });
        }
        return result;
      };

      // Extract unique package names from npm ls parseable output.
      // npm ls --parseable outputs one path per line like:
      //   /project/node_modules/@scope/pkg
      //   /project/node_modules/pkg
      // We extract the last node_modules/<name> segment and deduplicate.
      const extractUniquePackages = (stdout) => {
        if (!stdout) return new Set();
        const lines = stdout.trim().split('\n').filter(Boolean);
        const pkgNames = new Set();
        for (const line of lines) {
          const match = line.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)$/);
          if (match) pkgNames.add(match[1]);
        }
        return pkgNames;
      };

      // Build set of all package names in the SBOM (handling group/name split
      // from cyclonedx-npm where scoped packages have separate group and name)
      const sbomPackages = new Set();
      for (const comp of (enrichedSbom.components ?? [])) {
        const fullName = comp.group ? `${comp.group}/${comp.name}` : comp.name;
        if (fullName) sbomPackages.add(fullName);
      }

      // Get lockfile packages: production-only and all (including devDependencies)
      const prodResult = runNpmLs(['--omit=dev']);
      const allResult = runNpmLs();
      const prodPkgs = extractUniquePackages(prodResult.stdout);
      const allPkgs = extractUniquePackages(allResult.stdout);

      // Set containment check: find packages present in lockfile but missing from SBOM
      const prodMissing = [...prodPkgs].filter(pkg => !sbomPackages.has(pkg));
      const allMissing = [...allPkgs].filter(pkg => !sbomPackages.has(pkg));

      // If all production deps are covered, use that as the reference (most
      // generators exclude devDependencies, so this is the expected baseline)
      const isProductionComplete = prodMissing.length === 0;
      const refSet = isProductionComplete ? 'production' : 'all (incl. dev)';
      const missing = isProductionComplete ? prodMissing : allMissing;

      console.log(`  npm ls (prod):    ${prodPkgs.size} unique packages`);
      console.log(`  npm ls (all):     ${allPkgs.size} unique packages`);
      console.log(`  SBOM contains:    ${sbomPackages.size} unique components`);

      if (missing.length === 0) {
        // All lockfile packages found → mark composition as "complete"
        console.log(`  ✅ All ${refSet} dependencies found in SBOM → marking as "complete"`);
        if (Array.isArray(enrichedSbom.compositions)) {
          for (const comp of enrichedSbom.compositions) {
            if (comp.aggregate === 'incomplete') {
              comp.aggregate = 'complete';
            }
          }
        }
      } else {
        // Some packages missing → keep as "incomplete" and report which ones
        console.log(`  ⚠️  ${missing.length} ${refSet} packages not found in SBOM → "incomplete"`);
        if (missing.length <= 10) {
          missing.forEach(pkg => console.log(`      - ${pkg}`));
        } else {
          missing.slice(0, 10).forEach(pkg => console.log(`      - ${pkg}`));
          console.log(`      ... and ${missing.length - 10} more`);
        }
      }
    } catch (err) {
      console.warn(`  ⚠️  Could not verify completeness: ${err.message}`);
    }

    // 5. Validation: Double validation (Schema + BSI Rules)
    console.log(`\n[5/5] Validation: Double validation (Schema + BSI Rules)...`);
    const validationResult = await validateSbom(enrichedSbom);
    
    if (!validationResult.valid) {
      console.error("\n❌ Technical Taxonomy Validation Failed:");
      validationResult.errors.forEach(err => console.error(` - ${err}`));
      // We still write the file but exit with error
      writeFileSync(outputFile, JSON.stringify(enrichedSbom, null, 2), "utf8");
      console.log(`\n⚠️  Enriched SBOM (with technical errors) saved to: ${outputFile}`);
      console.log(DISCLAIMER);
      process.exit(1);
    }

    writeFileSync(outputFile, JSON.stringify(enrichedSbom, null, 2), "utf8");
    console.log(`\n✅ SBOM generated, enriched, and technically validated: ${outputFile}`);
    console.log(DISCLAIMER);

  } catch (error) {
    console.error(`\n❌ Error during generation: ${error.message}`);
    process.exit(1);
  } finally {
    // Cleanup: Remove isolation workspace
    if (isolatedPath) {
      console.log(`\n[Cleanup] Removing isolated workspace...`);
      cleanupIsolation(isolatedPath);
    }
  }
}
