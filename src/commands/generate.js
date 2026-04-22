import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename, join } from 'node:path';
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
  const outputFile = resolve(options.output || `${projectName}-bom.json`);
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
