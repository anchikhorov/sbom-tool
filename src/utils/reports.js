/**
 * Utility for generating audit reports in various formats.
 */

/**
 * Generates a Markdown report from audit findings.
 * @param {Array} findings - Array of audit findings.
 * @param {Object} metadata - Metadata about the audit (timestamp, target).
 * @returns {string} - Markdown formatted report.
 */
export function generateMarkdownReport(findings, metadata) {
  const errors = findings.filter(f => f.severity === 'error').length;
  const warnings = findings.filter(f => f.severity === 'warning').length;

  const summary = `
## Summary
| Metric | Value |
| --- | --- |
| Target | ${metadata.target} |
| Timestamp | ${metadata.timestamp} |
| Errors | ${errors} |
| Warnings | ${warnings} |
`;

  const findingsTable = `
## Findings
| Severity | Rule | Message | Location |
| --- | --- | --- | --- |
${findings.map(f => `| ${f.severity} | ${f.ruleId} | ${f.message} | ${f.location} |`).join('\n')}
`;

  const remediationAdvice = `
## Remediation Advice
${findings.map(f => `- **${f.ruleId}**: ${f.remediation} (${f.location})`).join('\n')}
`;

  return `# SBOM Audit Report

${summary}
${findingsTable}
${remediationAdvice}
`;
}

/**
 * Generates a JSON report from audit findings.
 * @param {Array} findings - Array of audit findings.
 * @param {Object} metadata - Metadata about the audit (timestamp, target).
 * @returns {string} - JSON formatted report.
 */
export function generateJSONReport(findings, metadata) {
  return JSON.stringify({
    metadata,
    findings,
    summary: {
      errors: findings.filter(f => f.severity === 'error').length,
      warnings: findings.filter(f => f.severity === 'warning').length,
      total: findings.length
    }
  }, null, 2);
}
