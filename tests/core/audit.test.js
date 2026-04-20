import { describe, it, expect } from 'vitest';
import { runAudit } from '../../src/core/audit.js';

describe('Audit Engine Core', () => {
  it('returns empty list for a perfect SBOM', () => {
    const sbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.6',
      metadata: {
        component: {
          name: 'perfect-app',
          version: '1.0.0',
          type: 'application'
        }
      },
      components: [
        {
          name: 'lodash',
          version: '4.17.21',
          type: 'library',
          licenses: [{ license: { id: 'MIT' } }]
        }
      ]
    };

    const findings = runAudit(sbom);
    expect(findings).toEqual([]);
  });

  it('flags NOASSERTION in component name, version, or license', () => {
    const sbom = {
      components: [
        {
          name: 'NOASSERTION',
          version: '1.0.0',
          type: 'library'
        },
        {
          name: 'some-lib',
          version: 'NOASSERTION',
          type: 'library'
        },
        {
          name: 'another-lib',
          version: '2.0.0',
          type: 'library',
          licenses: [{ license: { name: 'NOASSERTION' } }]
        }
      ]
    };

    const findings = runAudit(sbom);
    expect(findings.length).toBe(3);
    expect(findings[0].message).toContain('NOASSERTION');
    expect(findings[1].message).toContain('NOASSERTION');
    expect(findings[2].message).toContain('NOASSERTION');
  });

  it('flags LicenseRef-ROWE-Unknown as an audit finding', () => {
    const sbom = {
      components: [
        {
          name: 'unknown-license-lib',
          version: '1.0.0',
          type: 'library',
          licenses: [{ license: { id: 'LicenseRef-ROWE-Unknown' } }]
        }
      ]
    };

    const findings = runAudit(sbom);
    expect(findings.length).toBe(1);
    expect(findings[0].message).toContain('LicenseRef-ROWE-Unknown');
  });
});
