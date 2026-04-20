import axios from 'axios';

/**
 * Internal helper for axios GET with retry on 429.
 */
async function getWithRetry(url, options = {}, retries = 2, delay = 1000) {
  try {
    return await axios.get(url, options);
  } catch (error) {
    if (retries > 0 && error.response?.status === 429) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return getWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Fetches authoritative metadata from the NPM Registry (Tier 1).
 * 
 * @param {string} name - Package name (e.g., "lodash" or "@types/node")
 * @param {string} version - Package version (e.g., "4.17.21")
 * @returns {Promise<{integrity: string|null, license: string|null}>}
 */
export async function fetchRegistryData(name, version) {
  // Handle scoped packages: @scoped/pkg -> @scoped%2fpkg
  const encodedName = name.replace('/', '%2f');
  const url = `https://registry.npmjs.org/${encodedName}/${version}`;
  
  try {
    const response = await getWithRetry(url, { timeout: 10000 });
    
    if (response.status === 200 && response.data) {
      const data = response.data;
      
      const integrity = data.dist?.integrity || null;
      let license = null;

      if (typeof data.license === 'string') {
        license = data.license;
      } else if (data.license && typeof data.license.type === 'string') {
        license = data.license.type;
      } else if (Array.isArray(data.licenses) && data.licenses.length > 0) {
        // Support for legacy "licenses" array
        const first = data.licenses[0];
        license = typeof first === 'string' ? first : first.type;
      }

      return { integrity, license };
    }
  } catch (error) {
    // 404 is expected for some private or missing packages
    if (error.response?.status === 404) {
      return { integrity: null, license: null };
    }
    
    console.warn(`[NPM Provider] Failed to fetch ${name}@${version}: ${error.message}`);
  }
  
  return { integrity: null, license: null };
}
