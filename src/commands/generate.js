import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { resolve, basename, join } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync, execSync } from 'node:child_process';
import { enrichSbom } from '../core/enrichment.js';
import { loadConfig } from '../utils/config.js';

const CDXGEN_BIN_DIR = resolve(homedir(), ".local/bin");
const CDXGEN_BIN = join(CDXGEN_BIN_DIR, "cdxgen");
const CDXGEN_NPM_PKG = "@cyclonedx/cdxgen";

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
 * Captures command output.
 * @param {string} cmd Command to run.
 * @returns {string} Trimmed output.
 */
function capture(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch (err) {
    return "";
  }
}

/**
 * Ensures cdxgen is available.
 * @param {string} version Version to install if missing.
 * @returns {string} Command to run cdxgen.
 */
function ensureCdxgen(version) {
  function cdxgenAvailable() {
    try {
      const v = capture(`${CDXGEN_BIN} --version`);
      return !!v;
    } catch {
      return false;
    }
  }

  function cdxgenInPath() {
    try {
      const v = capture("cdxgen --version");
      return !!v;
    } catch {
      return false;
    }
  }

  if (cdxgenAvailable()) return CDXGEN_BIN;
  if (cdxgenInPath()) return "cdxgen";

  console.log(`cdxgen not found. Installing ${CDXGEN_NPM_PKG}@${version}...`);
  mkdirSync(CDXGEN_BIN_DIR, { recursive: true });
  try {
    const npmPrefix = capture("npm config get prefix");
    run(`npm install -g ${CDXGEN_NPM_PKG}@${version}`);
    const globalBin = join(npmPrefix, "bin", "cdxgen");
    return existsSync(globalBin) ? globalBin : "cdxgen";
  } catch (err) {
    console.warn("Failed to install cdxgen globally. Attempting to use 'cdxgen' from PATH.");
    return "cdxgen";
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
    console.error(`Error: project path not found: ${absProjectPath}`);
    process.exit(1);
  }

  const projectName = basename(absProjectPath);
  const outputFile = resolve(options.output || `${projectName}-bom.json`);
  const isolatedDir = `/tmp/${projectName}-sbom-isolated`;

  try {
    // 1. Isolate project
    console.log(`\n[1/4] Isolating project → ${isolatedDir}`);
    if (existsSync(isolatedDir)) {
      rmSync(isolatedDir, { recursive: true, force: true });
    }
    cpSync(absProjectPath, isolatedDir, {
      recursive: true,
      filter: (src) => !config.exclude.includes(basename(src)),
    });

    // 2. Ensure cdxgen
    console.log("\n[2/4] Checking cdxgen...");
    const generatorCmd = ensureCdxgen(config.cdxgenVersion);

    // 3. Generate raw SBOM
    const rawOutput = join(isolatedDir, `${projectName}-bom-raw.json`);
    console.log(`\n[3/4] Running cdxgen → ${rawOutput}`);
    run(
      `${generatorCmd} "${isolatedDir}" \\
        --output "${rawOutput}" \\
        --spec-version ${config.specVersion} \\
        --validate`,
      { cwd: isolatedDir }
    );

    if (!existsSync(rawOutput)) {
      throw new Error(`Generator did not produce output at ${rawOutput}`);
    }

    // 4. Enrich
    console.log(`\n[4/4] Enriching SBOM for BSI TR-03183-2 v2.1.0 compliance...`);
    const rawSbom = JSON.parse(readFileSync(rawOutput, "utf8"));
    const enrichedSbom = enrichSbom(rawSbom, {
      creatorEmail: config.creatorEmail,
      creatorUrl: config.creatorUrl
    });

    writeFileSync(outputFile, JSON.stringify(enrichedSbom, null, 2), "utf8");
    console.log(`\n✅ SBOM generated and enriched: ${outputFile}`);
  } catch (error) {
    console.error(`\n❌ Error during generation: ${error.message}`);
    process.exit(1);
  } finally {
    // Cleanup isolated dir
    if (existsSync(isolatedDir)) {
      rmSync(isolatedDir, { recursive: true, force: true });
    }
  }
}
