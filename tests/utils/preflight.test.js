import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkCdxgen, installCdxgen } from '../../src/utils/preflight.js';
import which from 'which';
import { existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

vi.mock('which');
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});
vi.mock('node:child_process', async () => {
  const actual = await vi.importActual('node:child_process');
  return {
    ...actual,
    execSync: vi.fn(),
  };
});

describe('preflight utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkCdxgen', () => {
    it('should return local path if it exists', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const path = await checkCdxgen();
      expect(path).toContain('tools/node_modules/.bin/cdxgen');
      expect(existsSync).toHaveBeenCalled();
      expect(which).not.toHaveBeenCalled();
    });

    it('should return system path if local doesn\'t exist but system one does', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(which).mockResolvedValue('/usr/local/bin/cdxgen');
      const path = await checkCdxgen();
      expect(path).toBe('/usr/local/bin/cdxgen');
      expect(existsSync).toHaveBeenCalled();
      expect(which).toHaveBeenCalledWith('cdxgen');
    });

    it('should return null if neither local nor system exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(which).mockRejectedValue(new Error('not found'));
      const path = await checkCdxgen();
      expect(path).toBeNull();
    });
  });

  describe('installCdxgen', () => {
    it('should install successfully', async () => {
      vi.mocked(existsSync).mockReturnValueOnce(false).mockReturnValueOnce(true);
      const result = await installCdxgen();
      expect(mkdirSync).toHaveBeenCalled();
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('npm install --prefix ./tools @cyclonedx/cdxgen'), expect.any(Object));
      expect(result).toBe(true);
    });

    it('should return false if installation fails', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockImplementation(() => { throw new Error('npm failed'); });
      const result = await installCdxgen();
      expect(result).toBe(false);
    });
  });
});
