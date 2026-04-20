import fs from 'fs/promises';
import path from 'path';

/**
 * Reads metadata from local node_modules (Tier 2).
 * 
 * @param {string} projectRoot - Root of the project being analyzed
 * @param {string} name - Package name
 * @returns {Promise<{license: string|null}>}
 */
export async function fetchLocalData(projectRoot, name) {
  const pkgJsonPath = path.join(projectRoot, 'node_modules', name, 'package.json');
  
  try {
    const content = await fs.readFile(pkgJsonPath, 'utf-8');
    const data = JSON.parse(content);
    
    let license = null;
    if (typeof data.license === 'string') {
      license = data.license;
    } else if (data.license && typeof data.license.type === 'string') {
      license = data.license.type;
    } else if (Array.isArray(data.licenses) && data.licenses.length > 0) {
      const first = data.licenses[0];
      license = typeof first === 'string' ? first : first.type;
    }
    
    return { license };
  } catch (error) {
    // Non-fatal, package may not be installed locally
    return { license: null };
  }
}
