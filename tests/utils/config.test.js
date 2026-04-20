import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadConfig } from '../../src/utils/config.js';
import { writeFileSync, unlinkSync, mkdirSync, rmdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('config utility', () => {
  const testDir = join(tmpdir(), 'sbom-test-config-' + Math.random().toString(36).substring(7));
  const configPath = join(testDir, 'sbom.config.json');

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (existsSync(configPath)) {
      try { unlinkSync(configPath); } catch (e) {}
    }
    if (existsSync(testDir)) {
      try { rmdirSync(testDir); } catch (e) {}
    }
  });

  it('should load default configuration when no file exists', () => {
    // Ensure ENV vars are not interfering
    vi.stubEnv('SBOM_CREATOR_EMAIL', '');
    vi.stubEnv('SBOM_CREATOR_URL', '');
    vi.stubEnv('SBOM_SPEC_VERSION', '');
    vi.stubEnv('CDXGEN_VERSION', '');

    const config = loadConfig(testDir);
    expect(config.creatorEmail).toBe("Simon.Kaempflein@rowe.de");
    expect(config.specVersion).toBe("1.6");
  });

  it('should load configuration from file', () => {
    const fileConfig = {
      creatorEmail: "custom@example.com",
      specVersion: "1.5"
    };
    writeFileSync(configPath, JSON.stringify(fileConfig));
    
    // Ensure ENV vars are not interfering
    vi.stubEnv('SBOM_CREATOR_EMAIL', '');
    vi.stubEnv('SBOM_SPEC_VERSION', '');

    const config = loadConfig(testDir);
    expect(config.creatorEmail).toBe("custom@example.com");
    expect(config.specVersion).toBe("1.5");
  });

  it('should prioritize environment variables over file config', () => {
    const fileConfig = {
      creatorEmail: "file@example.com",
      specVersion: "1.5"
    };
    writeFileSync(configPath, JSON.stringify(fileConfig));
    
    vi.stubEnv('SBOM_CREATOR_EMAIL', 'env@example.com');
    vi.stubEnv('SBOM_SPEC_VERSION', '1.6');
    vi.stubEnv('CDXGEN_VERSION', '12');

    const config = loadConfig(testDir);
    expect(config.creatorEmail).toBe("env@example.com");
    expect(config.specVersion).toBe("1.6");
    expect(config.cdxgenVersion).toBe("12");
  });
});
