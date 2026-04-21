import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_CONFIG_FILE = 'sbom.config.json';

/**
 * Load configuration from sbom.config.json and environment variables.
 * @param {string} cwd Current working directory to search for config file.
 * @returns {object} Loaded configuration object.
 */
export function loadConfig(cwd = process.cwd()) {
  const configPath = join(cwd, DEFAULT_CONFIG_FILE);
  let fileConfig = {};

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf8');
      fileConfig = JSON.parse(content);
    } catch (error) {
      console.warn(`Warning: Failed to parse ${DEFAULT_CONFIG_FILE}: ${error.message}`);
    }
  }

  return {
    creatorEmail: process.env.SBOM_CREATOR_EMAIL || fileConfig.creatorEmail || "user@example.com",
    creatorUrl: process.env.SBOM_CREATOR_URL || fileConfig.creatorUrl || "https://example.com",
    exclude: fileConfig.exclude || ["node_modules", ".git", "build", "dist", "coverage", ".cache"],
    cdxgenVersion: process.env.CDXGEN_VERSION || fileConfig.cdxgenVersion || "11",
    useCyclonedxNpm: fileConfig.useCyclonedxNpm || false,
    specVersion: process.env.SBOM_SPEC_VERSION || fileConfig.specVersion || "1.6"
  };
}
