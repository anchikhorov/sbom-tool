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
    completenessRule,
    integrityRule,
    complianceRule
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

const getComponentLocation = (comp) => {
  return `Component: ${comp.name}@${comp.version}${comp.purl ? ` (PURL: ${comp.purl})` : ''}`;
};

const completenessRule = {
  id: 'AUDIT-COMPLETENESS',
  severity: 'warning',
  test: (sbom) => {
    const findings = [];
    
    const checkComponent = (comp) => {
      const location = getComponentLocation(comp);
      
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

const integrityRule = {
  id: 'AUDIT-INTEGRITY',
  severity: 'warning',
  test: (sbom) => {
    const findings = [];

    const checkComponent = (comp) => {
      const location = getComponentLocation(comp);
      const hashSource = comp.properties?.find(p => p.name === 'bsi:hash-source')?.value;

      if (hashSource === 'calculated') {
        findings.push({
          ruleId: 'AUDIT-INTEGRITY',
          severity: 'warning',
          message: 'Component hash is calculated and requires manual verification.',
          location,
          remediation: 'Verify the hash against official sources and update source to "official".'
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

const complianceRule = {
  id: 'AUDIT-COMPLIANCE',
  severity: 'error',
  test: (sbom) => {
    const findings = [];

    // Check compositions
    if (sbom.compositions) {
      sbom.compositions.forEach((comp, index) => {
        if (comp.aggregate === 'incomplete') {
          findings.push({
            ruleId: 'AUDIT-COMPLIANCE',
            severity: 'error',
            message: 'Composition aggregate is incomplete.',
            location: `Composition: [${index}]`,
            remediation: 'Ensure all dependencies are included in the SBOM.'
          });
        }
      });
    }

    // Check BSI mandatory properties
    const checkComponent = (comp) => {
      const location = getComponentLocation(comp);
      const filename = comp.properties?.find(p => p.name === 'bsi:component:filename')?.value;

      if (!filename && comp.type !== 'application') {
        findings.push({
          ruleId: 'AUDIT-COMPLIANCE',
          severity: 'error',
          message: 'Missing mandatory BSI property: bsi:component:filename',
          location,
          remediation: 'Provide the filename for this component.'
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
