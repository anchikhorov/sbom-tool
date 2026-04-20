import { describe, it, expect, vi } from 'vitest';
import { validateSbom } from '../../src/core/validation.js';

vi.mock('../../src/utils/taxonomy-parser.js', () => ({
  getAllowedProperties: vi.fn().mockResolvedValue([
    'bsi:component:filename',
    'bsi:component:executable',
    'bsi:hash-source'
  ])
}));

describe('SBOM Validation', () => {
  const validSbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    serialNumber: 'urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79',
    version: 1,
    metadata: {
      timestamp: '2024-04-20T11:00:00Z',
      supplier: { name: 'Test Supplier' },
      component: {
        name: 'test-project',
        version: '1.0.0',
        type: 'application'
      }
    },
    components: [
      {
        'bom-ref': 'comp-1',
        name: 'test-component',
        version: '1.0.0',
        type: 'library',
        hashes: [
          { alg: 'SHA-512', content: 'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e' }
        ],
        supplier: { name: 'Comp Supplier' },
        licenses: [
          { license: { id: 'MIT' } }
        ],
        properties: [
          { name: 'bsi:component:filename', value: 'test-component.js' },
          { name: 'bsi:component:executable', value: 'false' }
        ]
      }
    ],
    dependencies: [
      {
        ref: 'comp-1',
        dependsOn: []
      }
    ]
  };

  it('should validate a compliant SBOM', async () => {
    const result = await validateSbom(validSbom);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail if SHA-512 hash is missing', async () => {
    const invalidSbom = JSON.parse(JSON.stringify(validSbom));
    delete invalidSbom.components[0].hashes;
    const result = await validateSbom(invalidSbom);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('SHA-512'))).toBe(true);
  });

  it('should fail if invalid SPDX ID is provided', async () => {
    const invalidSbom = JSON.parse(JSON.stringify(validSbom));
    invalidSbom.components[0].licenses[0].license.id = 'INVALID-ID';
    const result = await validateSbom(invalidSbom);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('SPDX ID'))).toBe(true);
  });

  it('should fail if BSI properties are missing', async () => {
    const invalidSbom = JSON.parse(JSON.stringify(validSbom));
    invalidSbom.components[0].properties = [];
    const result = await validateSbom(invalidSbom);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('bsi:component:filename'))).toBe(true);
    expect(result.errors.some(e => e.includes('bsi:component:executable'))).toBe(true);
  });

  it('should fail if global role is missing', async () => {
    const invalidSbom = JSON.parse(JSON.stringify(validSbom));
    delete invalidSbom.metadata.supplier;
    const result = await validateSbom(invalidSbom);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('top-level role'))).toBe(true);
  });

  it('should fail if unauthorized bsi property is present', async () => {
    const invalidSbom = JSON.parse(JSON.stringify(validSbom));
    invalidSbom.components[0].properties.push({ name: 'bsi:invalid:prop', value: 'value' });
    const result = await validateSbom(invalidSbom);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('not part of the allowed BSI property taxonomy'))).toBe(true);
  });
});
