import hostedGitInfo from 'hosted-git-info';

/**
 * Normalizes Git repository URIs to browseable URLs (Tier 3).
 * Useful for extracting source links from internal packages.
 * 
 * @param {string} gitUri - Original repository URI (ssh, git+https, github shortcut, etc)
 * @returns {{browse: string|null}}
 */
export function normalizeGitUrl(gitUri) {
  if (!gitUri) return { browse: null };
  
  try {
    const info = hostedGitInfo.fromUrl(gitUri);
    return {
      browse: info ? info.browse() : null
    };
  } catch (error) {
    // Malformed URI
    return { browse: null };
  }
}
