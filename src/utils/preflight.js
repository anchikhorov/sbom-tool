import which from 'which';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const TOOLS_DIR = join(process.cwd(), 'tools');
const LOCAL_CDXGEN_BIN = join(TOOLS_DIR, 'node_modules', '.bin', 'cdxgen');
const LOCAL_CYCLONEDX_NPM_BIN = join(TOOLS_DIR, 'node_modules', '.bin', 'cyclonedx-npm');

/**
 * Check if cdxgen is available in system PATH or local tools directory.
 * @returns {Promise<string|null>} Path to cdxgen or null if not found.
 */
export async function checkCdxgen() {
  // 1. Check local tools directory first
  if (existsSync(LOCAL_CDXGEN_BIN)) {
    return LOCAL_CDXGEN_BIN;
  }

  // 2. Check system PATH
  try {
    const path = await which('cdxgen');
    return path;
  } catch (error) {
    return null;
  }
}

/**
 * Install cdxgen locally into ./tools directory.
 * @returns {Promise<boolean>} True if installation succeeded.
 */
export async function installCdxgen() {
  try {
    if (!existsSync(TOOLS_DIR)) {
      mkdirSync(TOOLS_DIR, { recursive: true });
    }

    console.log('Installing @cyclonedx/cdxgen locally to ./tools...');
    execSync('npm install --prefix ./tools @cyclonedx/cdxgen', { stdio: 'inherit' });
    
    return existsSync(LOCAL_CDXGEN_BIN);
  } catch (error) {
    console.error(`Failed to install cdxgen: ${error.message}`);
    return false;
  }
}

/**
 * Check if cyclonedx-npm is available in system PATH or local tools directory.
 * @returns {Promise<string|null>} Path to cyclonedx-npm or null if not found.
 */
export async function checkCyclonedxNpm() {
  // 1. Check local tools directory first
  if (existsSync(LOCAL_CYCLONEDX_NPM_BIN)) {
    return LOCAL_CYCLONEDX_NPM_BIN;
  }

  // 2. Check system PATH
  try {
    const path = await which('cyclonedx-npm');
    return path;
  } catch (error) {
    return null;
  }
}

/**
 * Install cyclonedx-npm locally into ./tools directory.
 * @returns {Promise<boolean>} True if installation succeeded.
 */
export async function installCyclonedxNpm() {
  try {
    if (!existsSync(TOOLS_DIR)) {
      mkdirSync(TOOLS_DIR, { recursive: true });
    }

    console.log('Installing @cyclonedx/cyclonedx-npm locally to ./tools...');
    execSync('npm install --prefix ./tools @cyclonedx/cyclonedx-npm', { stdio: 'inherit' });
    
    return existsSync(LOCAL_CYCLONEDX_NPM_BIN);
  } catch (error) {
    console.error(`Failed to install cyclonedx-npm: ${error.message}`);
    return false;
  }
}
