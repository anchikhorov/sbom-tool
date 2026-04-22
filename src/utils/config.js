import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const DEFAULT_CONFIG_FILE = 'sbom.config.json';

function getGitConfig(key, cwd) {
  try {
    return execSync(`git config ${key}`, { cwd, stdio: 'pipe', encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

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

  // Auto-detect creator info from CI/CD or Git
  const ciEmail = process.env.GITLAB_USER_EMAIL || (process.env.GITHUB_ACTOR ? `${process.env.GITHUB_ACTOR}@users.noreply.github.com` : null);
  const ciUrl = process.env.CI_PROJECT_URL || (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}` : null);
  
  const gitEmail = getGitConfig('user.email', cwd);
  const gitUrl = getGitConfig('--get remote.origin.url', cwd);

  const fallbackEmail = ciEmail || gitEmail || "user@example.com";
  const fallbackUrl = ciUrl || gitUrl || "https://example.com";

  return {
    creatorEmail: process.env.SBOM_CREATOR_EMAIL || fileConfig.creatorEmail || fallbackEmail,
    creatorUrl: process.env.SBOM_CREATOR_URL || fileConfig.creatorUrl || fallbackUrl,
    exclude: fileConfig.exclude || ["node_modules", ".git", "build", "dist", "coverage", ".cache"],
    privatePackages: fileConfig.privatePackages || [],
    cdxgenVersion: process.env.CDXGEN_VERSION || fileConfig.cdxgenVersion || "11",
    useCyclonedxNpm: fileConfig.useCyclonedxNpm || false,
    specVersion: process.env.SBOM_SPEC_VERSION || fileConfig.specVersion || "1.6",
    // Directory where sbom.config.json was found (or cwd if not found)
    // Used to resolve default output paths relative to the tool install location.
    configDir: cwd
  };
}
