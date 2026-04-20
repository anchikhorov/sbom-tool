import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

/**
 * Calculate SHA-512 hash of a file.
 * @param {string} filePath Path to the file.
 * @param {number} timeoutMs Optional timeout in milliseconds.
 * @returns {Promise<string|null>} Lowercase hex string of the SHA-512 hash, or null if it fails/times out.
 */
export async function calculateSha512(filePath, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const hash = createHash('sha512');
    let stream;
    
    const timeout = setTimeout(() => {
      if (stream) stream.destroy();
      resolve(null);
    }, timeoutMs);

    try {
      stream = createReadStream(filePath);
      stream.on('error', () => {
        clearTimeout(timeout);
        resolve(null);
      });

      pipeline(stream, hash)
        .then(() => {
          clearTimeout(timeout);
          resolve(hash.digest('hex').toLowerCase());
        })
        .catch(() => {
          clearTimeout(timeout);
          resolve(null);
        });
    } catch (err) {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}
