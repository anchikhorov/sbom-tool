import { existsSync, mkdirSync, cpSync, rmSync, mkdtempSync } from 'node:fs';
import { resolve, basename, join } from 'node:path';
import { tmpdir } from 'node:os';

const MANIFESTS = {
  npm: ['package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml'],
  maven: ['pom.xml', 'maven-metadata.xml'],
  python: ['requirements.txt', 'setup.py', 'pyproject.toml', 'poetry.lock']
};

/**
 * Detects the project type based on manifest files in the directory.
 * 
 * @param {string} projectPath - Path to the project
 * @returns {string|null} - Project type (npm, maven, python) or null
 */
export function detectProjectType(projectPath) {
  for (const [type, files] of Object.entries(MANIFESTS)) {
    if (files.some(file => existsSync(join(projectPath, file)))) {
      return type;
    }
  }
  return null;
}

/**
 * Creates a temporary directory and copies only manifest files for isolation.
 * 
 * @param {string} projectPath - Path to the original project
 * @returns {{isolatedPath: string, projectType: string|null}}
 */
export function prepareIsolation(projectPath) {
  const absPath = resolve(projectPath);
  const projectType = detectProjectType(absPath);
  
  const isolatedPath = mkdtempSync(join(tmpdir(), `sbom-isolated-${basename(absPath)}-`));
  
  if (projectType) {
    const filesToCopy = MANIFESTS[projectType];
    for (const file of filesToCopy) {
      const src = join(absPath, file);
      const dest = join(isolatedPath, file);
      if (existsSync(src)) {
        cpSync(src, dest);
      }
    }
  } else {
    // If unknown type, copy everything except common heavy dirs
    // This is a fallback to maintain backward compatibility with general cdxgen behavior
    const EXCLUDED_DIRS = ["node_modules", ".git", "build", "dist", "coverage", ".cache"];
    cpSync(absPath, isolatedPath, {
      recursive: true,
      filter: (src) => !EXCLUDED_DIRS.includes(basename(src))
    });
  }

  return { isolatedPath, projectType };
}

/**
 * Cleans up the isolated directory.
 * Skip cleanup if DEBUG environment variable is set.
 * 
 * @param {string} isolatedPath - Path to remove
 */
export function cleanupIsolation(isolatedPath) {
  if (process.env.DEBUG) {
    console.log(`[DEBUG] Skipping cleanup of isolated path: ${isolatedPath}`);
    return;
  }

  if (isolatedPath && isolatedPath.startsWith(tmpdir())) {
    rmSync(isolatedPath, { recursive: true, force: true });
  }
}
