import { vi, describe, it, expect, beforeEach } from 'vitest';
import { generateAction } from '../src/commands/generate.js';
import { validateAction } from '../src/commands/validate.js';
import * as fs from 'node:fs';
import * as child_process from 'node:child_process';

// Mock node:fs
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    cpSync: vi.fn(),
    rmSync: vi.fn(),
  };
});

// Mock node:child_process
vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(() => ({ status: 0 })),
  execSync: vi.fn(() => '11.0.0'),
}));

// Mock config to avoid env/file dependencies
vi.mock('../src/utils/config.js', () => ({
  loadConfig: vi.fn(() => ({
    creatorEmail: "Simon.Kaempflein@rowe.de",
    creatorUrl: "https://www.rowe.de/",
    exclude: ["node_modules", ".git"],
    cdxgenVersion: "11",
    specVersion: "1.6"
  }))
}));

describe('CLI Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAction', () => {
    it('should run cdxgen and enrich output', async () => {
      // Setup mocks for generateAction
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({ 
        bomFormat: 'CycloneDX',
        specVersion: '1.6',
        metadata: { component: { name: 'test', type: 'library', 'bom-ref': 'test' } },
        components: []
      }));

      await generateAction('test-project', { output: 'bom.json' });

      // Verify cdxgen was called via spawnSync
      expect(child_process.spawnSync).toHaveBeenCalled();
      
      // Verify enrichment was applied and saved
      expect(fs.writeFileSync).toHaveBeenCalled();
      const [path, content] = fs.writeFileSync.mock.calls[0];
      expect(path).toContain('bom.json');
      
      const sbom = JSON.parse(content);
      expect(sbom.metadata.manufacturer.contact[0].email).toBe('Simon.Kaempflein@rowe.de');
      expect(sbom.specVersion).toBe('1.6');
    });

    it('should exit if project path does not exist', async () => {
      fs.existsSync.mockReturnValue(false);
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await generateAction('non-existent', {});

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });
  });

  describe('validateAction', () => {
    it('should report valid SBOM', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.6',
        metadata: { 
          manufacturer: { contact: [{ email: 'test@example.com' }] },
          component: { name: 'root', type: 'application', 'bom-ref': 'root' }
        },
        components: [
          {
            name: 'comp',
            version: '1.0.0',
            type: 'library',
            'bom-ref': 'comp',
            hashes: [{ alg: 'SHA-512', content: 'a'.repeat(128) }],
            manufacturer: { name: 'Vendor' },
            licenses: [{ license: { id: 'MIT' } }],
            properties: [
              { name: 'bsi:component:filename', value: 'comp.js' },
              { name: 'bsi:component:executable', value: 'executable' }
            ]
          }
        ],
        dependencies: [
           { ref: 'root', dependsOn: ['comp'] },
           { ref: 'comp', dependsOn: [] }
        ]
      }));

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await validateAction('bom.json');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('✅ SBOM technical taxonomy is valid'));
    });

    it('should report invalid SBOM errors', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.6',
        components: [
          { name: 'missing-everything' }
        ]
      }));

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

      await validateAction('bom.json');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('❌ SBOM technical taxonomy validation failed'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
