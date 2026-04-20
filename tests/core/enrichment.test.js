import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrichSbom, enrichComponent } from '../../src/core/enrichment.js';
import * as npmProvider from '../../src/core/enrichment/npm-provider.js';
import * as localProvider from '../../src/core/enrichment/local-provider.js';
import * as gitProvider from '../../src/core/enrichment/git-provider.js';
import * as hashUtils from '../../src/utils/hash.js';

vi.mock('../../src/core/enrichment/npm-provider.js');
vi.mock('../../src/core/enrichment/local-provider.js');
vi.mock('../../src/core/enrichment/git-provider.js');
vi.mock('../../src/utils/hash.js');

describe('enrichComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    npmProvider.fetchRegistryData.mockResolvedValue({ integrity: null, license: null });
    localProvider.fetchLocalData.mockResolvedValue({ license: null });
    gitProvider.normalizeGitUrl.mockReturnValue({ browse: null });
  });

  it('should add BSI properties to a minimal component', async () => {
    const comp = {
      name: 'test-pkg',
      version: '1.0.0',
      purl: 'pkg:npm/test-pkg@1.0.0'
    };
    await enrichComponent(comp);
    
    const props = comp.properties;
    expect(props.find(p => p.name === 'bsi:component:filename').value).toBe('test-pkg.js');
    expect(props.find(p => p.name === 'bsi:component:executable').value).toBe('executable');
    expect(props.find(p => p.name === 'bsi:component:archive').value).toBe('no archive');
    expect(props.find(p => p.name === 'bsi:component:structured').value).toBe('unstructured');
    expect(props.find(p => p.name === 'bsi:component:effectiveLicence').value).toBe('LicenseRef-ROWE-Unknown');
  });

  it('should use registry data for license and integrity (Tier 1)', async () => {
    const shaHex = 'a'.repeat(128);
    npmProvider.fetchRegistryData.mockResolvedValue({
      license: 'MIT',
      integrity: `sha512-${Buffer.from(shaHex, 'hex').toString('base64')}`
    });

    const comp = {
      name: 'test-pkg',
      version: '1.0.0',
      purl: 'pkg:npm/test-pkg@1.0.0'
    };
    await enrichComponent(comp);

    expect(comp.licenses[0].expression).toBe('MIT');
    expect(comp.hashes.find(h => h.alg === 'SHA-512').content).toBe(shaHex);
  });

  it('should fallback to local data for license (Tier 2)', async () => {
    localProvider.fetchLocalData.mockResolvedValue({ license: 'Apache-2.0' });

    const comp = {
      name: 'test-pkg',
      version: '1.0.0',
      purl: 'pkg:npm/test-pkg@1.0.0'
    };
    await enrichComponent(comp);

    expect(comp.licenses[0].expression).toBe('Apache-2.0');
  });

  it('should use git browse URL if available (Tier 3)', async () => {
    gitProvider.normalizeGitUrl.mockReturnValue({ browse: 'https://github.com/user/repo' });

    const comp = {
      name: 'test-pkg',
      externalReferences: [{ type: 'vcs', url: 'git+ssh://git@github.com:user/repo.git' }]
    };
    await enrichComponent(comp);

    const distRef = comp.externalReferences.find(r => r.type === 'distribution');
    expect(distRef.url).toBe('https://github.com/user/repo');
  });

  it('should calculate hash if missing (Tier 4)', async () => {
    const calcSha = 'b'.repeat(128);
    hashUtils.calculateSha512.mockResolvedValue(calcSha);

    const comp = {
      name: 'test-pkg',
      version: '1.0.0',
      purl: 'pkg:npm/test-pkg@1.0.0'
    };
    await enrichComponent(comp);

    expect(comp.hashes.find(h => h.alg === 'SHA-512').content).toBe(calcSha);
    expect(comp.properties.find(p => p.name === 'bsi:hash-source').value).toBe('calculated');
  });

  it('should respect existing bsi:filename', async () => {
    const comp = {
      name: 'test-pkg',
      properties: [{ name: 'bsi:component:filename', value: 'custom.js' }]
    };
    await enrichComponent(comp);
    expect(comp.properties.find(p => p.name === 'bsi:component:filename').value).toBe('custom.js');
  });

  it('should fix manufacturer format for CycloneDX 1.6', async () => {
    const comp = {
      name: 'test-pkg',
      purl: 'pkg:npm/test-pkg@1.0.0',
      manufacturer: { name: 'Some Org', url: 'https://example.com' }
    };
    await enrichComponent(comp);
    expect(Array.isArray(comp.manufacturer.url)).toBe(true);
    expect(comp.manufacturer.url[0]).toBe('https://example.com');
  });
});

describe('enrichSbom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    npmProvider.fetchRegistryData.mockResolvedValue({ integrity: null, license: null });
  });

  it('should enrich a minimal SBOM', async () => {
    const sbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      components: [
        { name: 'comp1', version: '1.0.0', 'bom-ref': 'pkg:npm/comp1@1.0.0' }
      ]
    };
    
    await enrichSbom(sbom);
    
    expect(sbom.specVersion).toBe('1.6');
    expect(sbom.serialNumber).toMatch(/^urn:uuid:/);
    expect(sbom.metadata.timestamp).toBeDefined();
    expect(sbom.metadata.manufacturer.contact[0].email).toBe('Simon.Kaempflein@rowe.de');
    expect(sbom.components[0].properties).toBeDefined();
    
    // Check dependency graph
    expect(sbom.dependencies.find(d => d.ref === 'pkg:npm/comp1@1.0.0')).toBeDefined();
  });
});
