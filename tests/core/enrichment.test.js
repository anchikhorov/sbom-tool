import { describe, it, expect, vi } from 'vitest';
import { enrichSbom, enrichComponent } from '../../src/core/enrichment.js';

describe('enrichComponent', () => {
  it('should add BSI properties to a minimal component', () => {
    const comp = {
      name: 'test-pkg',
      version: '1.0.0',
      purl: 'pkg:npm/test-pkg@1.0.0'
    };
    enrichComponent(comp);
    
    const props = comp.properties;
    expect(props.find(p => p.name === 'bsi:component:filename').value).toBe('test-pkg.js');
    expect(props.find(p => p.name === 'bsi:component:executable').value).toBe('executable');
    expect(props.find(p => p.name === 'bsi:component:archive').value).toBe('no archive');
    expect(props.find(p => p.name === 'bsi:component:structured').value).toBe('unstructured');
    expect(props.find(p => p.name === 'bsi:license:acknowledgement').value).toBe('concluded');
  });

  it('should respect existing bsi:filename', () => {
    const comp = {
      name: 'test-pkg',
      properties: [{ name: 'bsi:component:filename', value: 'custom.js' }]
    };
    enrichComponent(comp);
    expect(comp.properties.find(p => p.name === 'bsi:component:filename').value).toBe('custom.js');
  });

  it('should map existing SHA-512 from hashes to distribution externalReference', () => {
    const sha = 'a'.repeat(128);
    const comp = {
      name: 'test-pkg',
      hashes: [{ alg: 'SHA-512', content: sha }]
    };
    enrichComponent(comp);
    
    const distRef = comp.externalReferences.find(r => r.type === 'distribution');
    expect(distRef.hashes.find(h => h.alg === 'SHA-512').content).toBe(sha);
  });

  it('should fix manufacturer format for CycloneDX 1.6', () => {
    const comp = {
      name: 'test-pkg',
      purl: 'pkg:npm/test-pkg@1.0.0',
      manufacturer: { name: 'Some Org', url: 'https://example.com' }
    };
    enrichComponent(comp);
    expect(Array.isArray(comp.manufacturer.url)).toBe(true);
    expect(comp.manufacturer.url[0]).toBe('https://example.com');
  });
});

describe('enrichSbom', () => {
  it('should enrich a minimal SBOM', () => {
    const sbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      components: [
        { name: 'comp1', version: '1.0.0', 'bom-ref': 'pkg:npm/comp1@1.0.0' }
      ]
    };
    
    enrichSbom(sbom);
    
    expect(sbom.specVersion).toBe('1.6');
    expect(sbom.serialNumber).toMatch(/^urn:uuid:/);
    expect(sbom.metadata.timestamp).toBeDefined();
    expect(sbom.metadata.manufacturer.contact[0].email).toBe('Simon.Kaempflein@rowe.de');
    expect(sbom.components[0].properties).toBeDefined();
    
    // Check dependency graph
    expect(sbom.dependencies.find(d => d.ref === 'pkg:npm/comp1@1.0.0')).toBeDefined();
  });

  it('should ensure all components are in dependencies graph', () => {
    const sbom = {
      components: [
        { name: 'comp1', 'bom-ref': 'ref1' },
        { name: 'comp2', 'bom-ref': 'ref2' }
      ],
      dependencies: [
        { ref: 'ref1', dependsOn: [] }
      ]
    };
    
    enrichSbom(sbom);
    
    expect(sbom.dependencies).toHaveLength(2);
    expect(sbom.dependencies.some(d => d.ref === 'ref2')).toBe(true);
  });

  it('should add incomplete composition if metadata.component is present', () => {
    const sbom = {
      metadata: {
        component: { name: 'root', 'bom-ref': 'root-ref' }
      }
    };
    
    enrichSbom(sbom);
    
    expect(sbom.compositions).toHaveLength(1);
    expect(sbom.compositions[0].aggregate).toBe('incomplete');
    expect(sbom.compositions[0].assemblies).toContain('root-ref');
  });
});
