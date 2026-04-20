import { describe, it, expect } from 'vitest';
import { calculateSha512 } from '../../src/utils/hash.js';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('hash utility', () => {
  const testFilePath = join(tmpdir(), 'test-file-for-hash.txt');
  const testContent = 'Hello, SBOM Tool!';
  const expectedHash = 'e85171f8e2b1fb4aeee88d58052a19ad76248413cabb7aebcd667458f597de01d7edafc438682306895a6af5b03cf07b7a1ade8f4072d4a2418cc1b842d55509';

  it('should calculate correct SHA-512 for a file', async () => {
    writeFileSync(testFilePath, testContent);
    try {
      const hash = await calculateSha512(testFilePath);
      expect(hash).toBe(expectedHash);
    } finally {
      try { unlinkSync(testFilePath); } catch (e) {}
    }
  });

  it('should throw error for non-existent file', async () => {
    await expect(calculateSha512('/non/existent/file-' + Math.random())).rejects.toThrow();
  });
});
