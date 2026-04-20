import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { runAudit } from '../core/audit.js';
import { validateSbom } from '../core/validation.js';
import { generateMarkdownReport, generateJSONReport } from '../utils/reports.js';

/**
 * CLI action for auditing an SBOM file.
 * @param {string} inputPath - Path to the SBOM file.
 * @param {Object} options - CLI options.
 */
export async function auditAction(inputPath, options) {
  const fullPath = resolve(inputPath);
  if (!existsSync(fullPath)) {
    console.error(`Error: File ${fullPath} not found.`);
    process.exit(1);
  }

  let sbom;
  try {
    sbom = JSON.parse(readFileSync(fullPath, 'utf8'));
  } catch (err) {
    console.error(`Error: Invalid JSON file ${fullPath}.`);
    process.exit(1);
  }

  const outputDir = resolve(options.outputDir || './audit-reports/');
  mkdirSync(outputDir, { recursive: true });

  const findings = [];

  // 1. Structural and Taxonomy Validation
  const validationResult = await validateSbom(sbom);
  if (!validationResult.valid) {
    validationResult.errors.forEach(err => {
      findings.push({
        ruleId: 'VALIDATION-ERROR',
        severity: 'error',
        message: err,
        location: 'Structural/Taxonomy',
        remediation: 'Fix the reported validation error in the SBOM source.'
      });
    });
  }

  // 2. Compliance Audit
  const auditFindings = runAudit(sbom);
  findings.push(...auditFindings);

  const metadata = {
    target: inputPath,
    timestamp: new Date().toISOString()
  };

  const format = options.format || 'both';

  if (format === 'markdown' || format === 'both') {
    const markdown = generateMarkdownReport(findings, metadata);
    writeFileSync(join(outputDir, 'audit-report.md'), markdown);
  }

  if (format === 'json' || format === 'both') {
    const json = generateJSONReport(findings, metadata);
    writeFileSync(join(outputDir, 'audit-report.json'), json);
  }

  console.log(`✅ Audit complete. Reports saved to ${outputDir}`);
}
