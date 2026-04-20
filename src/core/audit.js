/**
 * Modular audit engine for compliance auditing.
 */

/**
 * @typedef {Object} AuditFinding
 * @property {string} ruleId
 * @property {string} severity
 * @property {string} message
 * @property {string} location
 * @property {string} remediation
 */

/**
 * Runs all audit rules against the provided SBOM.
 * @param {Object} sbom - The CycloneDX SBOM object.
 * @returns {AuditFinding[]} - Array of findings.
 */
export function runAudit(sbom) {
  const findings = [];
  const rules = [
    completenessRule
  ];

  for (const rule of rules) {
    try {
      findings.push(...rule.test(sbom));
    } catch (err) {
      console.error(`Rule ${rule.id} failed:`, err);
    }
  }

  return findings;
}

const completenessRule = {
  id: 'AUDIT-COMPLETENESS',
  severity: 'warning',
  test: (sbom) => {
    const findings = [];
    
    const checkComponent = (comp) => {
      const location = `Component: ${comp.name}@${comp.version}${comp.purl ? ` (PURL: ${comp.purl})` : ''}`;
      
      if (comp.name === 'NOASSERTION') {
        findings.push({
          ruleId: 'AUDIT-COMPLETENESS',
          severity: 'warning',
          message: 'Component name is NOASSERTION',
          location,
          remediation: 'Provide a valid name for the component.'
        });
      }
      
      if (comp.version === 'NOASSERTION') {
        findings.push({
          ruleId: 'AUDIT-COMPLETENESS',
          severity: 'warning',
          message: 'Component version is NOASSERTION',
          location,
          remediation: 'Provide a valid version for the component.'
        });
      }

      if (comp.licenses) {
        comp.licenses.forEach(l => {
          const license = l.license;
          if (license) {
            if (license.name === 'NOASSERTION' || license.id === 'NOASSERTION') {
              findings.push({
                ruleId: 'AUDIT-COMPLETENESS',
                severity: 'warning',
                message: 'Component license is NOASSERTION',
                location,
                remediation: 'Provide a valid license for the component.'
              });
            }
            if (license.id === 'LicenseRef-ROWE-Unknown') {
              findings.push({
                ruleId: 'AUDIT-COMPLETENESS',
                severity: 'warning',
                message: 'Component has an unknown license (LicenseRef-ROWE-Unknown)',
                location,
                remediation: 'Manually verify and provide the correct license.'
              });
            }
          }
        });
      }
    };

    if (sbom.metadata && sbom.metadata.component) {
      checkComponent(sbom.metadata.component);
    }

    if (sbom.components) {
      sbom.components.forEach(checkComponent);
    }

    return findings;
  }
};
