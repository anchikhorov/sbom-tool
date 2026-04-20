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
          licenses: [{ license: { id: 'MIT' } }],
          properties: [
            { name: 'bsi:component:filename', value: 'lodash-4.17.21.tgz' }
          ]
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
          type: 'library',
          properties: [
            { name: 'bsi:component:filename', value: 'lib1.tgz' }
          ]
        },
        {
          name: 'some-lib',
          version: 'NOASSERTION',
          type: 'library',
          properties: [
            { name: 'bsi:component:filename', value: 'lib2.tgz' }
          ]
        },
        {
          name: 'another-lib',
          version: '2.0.0',
          type: 'library',
          licenses: [{ license: { name: 'NOASSERTION' } }],
          properties: [
            { name: 'bsi:component:filename', value: 'lib3.tgz' }
          ]
        }
      ]
    };

    const findings = runAudit(sbom);
    // Each component has 1 NOASSERTION issue, and we provided filename to avoid COMPLIANCE error.
    expect(findings.length).toBe(3);
    expect(findings.every(f => f.ruleId === 'AUDIT-COMPLETENESS')).toBe(true);
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
          licenses: [{ license: { id: 'LicenseRef-ROWE-Unknown' } }],
          properties: [
            { name: 'bsi:component:filename', value: 'unknown.tgz' }
          ]
        }
      ]
    };

    const findings = runAudit(sbom);
    expect(findings.length).toBe(1);
    expect(findings[0].message).toContain('LicenseRef-ROWE-Unknown');
    expect(findings[0].ruleId).toBe('AUDIT-COMPLETENESS');
  });

  describe('Integrity Rules', () => {
    it('flags component if bsi:hash-source is calculated', () => {
      const sbom = {
        components: [
          {
            name: 'calc-lib',
            version: '1.0.0',
            type: 'library',
            properties: [
              { name: 'bsi:hash-source', value: 'calculated' },
              { name: 'bsi:component:filename', value: 'calc.tgz' }
            ]
          }
        ]
      };

      const findings = runAudit(sbom);
      expect(findings.length).toBe(1);
      expect(findings[0].message).toContain('calculated');
      expect(findings[0].ruleId).toBe('AUDIT-INTEGRITY');
    });
  });

  describe('BSI Property Rules', () => {
    it('flags composition if aggregate is incomplete', () => {
      const sbom = {
        compositions: [
          {
            aggregate: 'incomplete'
          }
        ]
      };

      const findings = runAudit(sbom);
      expect(findings.length).toBe(1);
      expect(findings[0].message).toContain('incomplete');
      expect(findings[0].ruleId).toBe('AUDIT-COMPLIANCE');
    });

    it('flags component if mandatory BSI properties like bsi:component:filename are missing', () => {
      const sbom = {
        components: [
          {
            name: 'missing-prop-lib',
            version: '1.0.0',
            type: 'library'
            // Missing bsi:component:filename
          }
        ]
      };

      const findings = runAudit(sbom);
      expect(findings.length).toBe(1);
      expect(findings[0].message).toContain('bsi:component:filename');
      expect(findings[0].ruleId).toBe('AUDIT-COMPLIANCE');
    });
  });
});
