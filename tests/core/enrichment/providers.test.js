import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import { fetchRegistryData } from '../../../src/core/enrichment/npm-provider.js';
import { fetchLocalData } from '../../../src/core/enrichment/local-provider.js';
import { normalizeGitUrl } from '../../../src/core/enrichment/git-provider.js';

vi.mock('fs/promises');

global.fetch = vi.fn();

describe('Enrichment Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NPM Provider (Tier 1)', () => {
    it('should fetch integrity and license from registry', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          dist: { integrity: 'sha512-abc' },
          license: 'MIT'
        })
      });

      const result = await fetchRegistryData('lodash', '4.17.21');
      expect(result).toEqual({ integrity: 'sha512-abc', license: 'MIT' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/lodash/4.17.21',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('should handle scoped packages', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ dist: {}, license: 'MIT' })
      });
      await fetchRegistryData('@types/node', '20.0.0');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/@types%2fnode/20.0.0',
        expect.any(Object)
      );
    });

    it('should retry on 429', async () => {
      global.fetch
        .mockResolvedValueOnce({ status: 429 })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ dist: { integrity: 'sha512-abc' } })
        });

      // We use fake timers to handle the retry delay
      vi.useFakeTimers();
      
      const promise = fetchRegistryData('lodash', '4.17.21');
      
      // Advance timers to trigger retry
      await vi.advanceTimersByTimeAsync(1100);
      
      const result = await promise;
      
      expect(result.integrity).toBe('sha512-abc');
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      vi.useRealTimers();
    });

    it('should return nulls on 404', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 404 });
      const result = await fetchRegistryData('non-existent', '1.0.0');
      expect(result).toEqual({ integrity: null, license: null });
    });
  });

  describe('Local Provider (Tier 2)', () => {
    it('should read license from local package.json', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({ license: 'Apache-2.0' }));
      const result = await fetchLocalData('/root', 'my-pkg');
      expect(result).toEqual({ license: 'Apache-2.0' });
    });

    it('should handle object license format', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({ license: { type: 'ISC' } }));
      const result = await fetchLocalData('/root', 'my-pkg');
      expect(result.license).toBe('ISC');
    });

    it('should return null on missing file', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT'));
      const result = await fetchLocalData('/root', 'my-pkg');
      expect(result.license).toBeNull();
    });
  });

  describe('Git Provider (Tier 3)', () => {
    it('should normalize github ssh to browseable url', () => {
      const result = normalizeGitUrl('git+ssh://git@github.com/BSI-Bund/tr-03183-cyclonedx-property-taxonomy.git');
      expect(result.browse).toBe('https://github.com/BSI-Bund/tr-03183-cyclonedx-property-taxonomy');
    });

    it('should handle github shorthand', () => {
      const result = normalizeGitUrl('github:user/repo');
      expect(result.browse).toBe('https://github.com/user/repo');
    });

    it('should return null for invalid uris', () => {
      const result = normalizeGitUrl('not-a-git-uri');
      expect(result.browse).toBeNull();
    });
  });
});
