import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { runAudit } from '../core/audit.js';
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

  const findings = runAudit(sbom);

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
