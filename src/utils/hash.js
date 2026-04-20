import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

/**
 * Calculate SHA-512 hash of a file.
 * @param {string} filePath Path to the file.
 * @returns {Promise<string>} Lowercase hex string of the SHA-512 hash.
 */
export async function calculateSha512(filePath) {
  const hash = createHash('sha512');
  const stream = createReadStream(filePath);
  
  await pipeline(stream, hash);
  
  return hash.digest('hex').toLowerCase();
}
