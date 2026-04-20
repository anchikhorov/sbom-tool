import { describe, it, expect } from 'vitest';
import { generateMarkdownReport, generateJSONReport } from '../../src/utils/reports.js';

describe('Report Generators', () => {
  const mockFindings = [
    {
      ruleId: 'AUDIT-COMPLIANCE',
      severity: 'error',
      message: 'Missing mandatory BSI property: bsi:component:filename',
      location: 'Component: missing-prop-lib@1.0.0',
      remediation: 'Provide the filename for this component.'
    },
    {
      ruleId: 'AUDIT-COMPLETENESS',
      severity: 'warning',
      message: 'Component name is NOASSERTION',
      location: 'Component: NOASSERTION@1.0.0',
      remediation: 'Provide a valid name for the component.'
    }
  ];

  const mockMetadata = {
    timestamp: '2024-05-24T12:00:00.000Z',
    target: 'project-bom.json'
  };

  describe('generateMarkdownReport', () => {
    it('includes "SBOM Audit Report" header', () => {
      const report = generateMarkdownReport(mockFindings, mockMetadata);
      expect(report).toContain('# SBOM Audit Report');
    });

    it('reflects correct counts in summary section', () => {
      const report = generateMarkdownReport(mockFindings, mockMetadata);
      expect(report).toContain('| Errors | 1 |');
      expect(report).toContain('| Warnings | 1 |');
    });

    it('contains findings table with expected columns', () => {
      const report = generateMarkdownReport(mockFindings, mockMetadata);
      expect(report).toContain('| Severity | Rule | Message | Location |');
      expect(report).toContain('| error | AUDIT-COMPLIANCE | Missing mandatory BSI property: bsi:component:filename |');
      expect(report).toContain('Component: missing-prop-lib@1.0.0');
    });

    it('includes remediation advice', () => {
      const report = generateMarkdownReport(mockFindings, mockMetadata);
      expect(report).toContain('## Remediation Advice');
      expect(report).toContain('Provide the filename for this component.');
    });
  });

  describe('generateJSONReport', () => {
    it('returns a valid JSON string', () => {
      const report = generateJSONReport(mockFindings, mockMetadata);
      const parsed = JSON.parse(report);
      expect(parsed).toBeInstanceOf(Object);
    });

    it('contains metadata and findings array', () => {
      const report = generateJSONReport(mockFindings, mockMetadata);
      const parsed = JSON.parse(report);
      expect(parsed.metadata).toEqual(mockMetadata);
      expect(parsed.findings).toEqual(mockFindings);
    });
  });
});
