#!/usr/bin/env node

import { Command } from 'commander';
import { generateAction } from '../src/commands/generate.js';
import { validateAction } from '../src/commands/validate.js';
import { auditAction } from '../src/commands/audit.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const program = new Command();

program
  .name('sbom-tool')
  .description('Enterprise SBOM generation and validation tool compliant with BSI TR-03183-2')
  .version(pkg.version);

program
  .command('generate')
  .description('Generate an enriched CycloneDX 1.6 SBOM')
  .argument('<path>', 'Path to the project')
  .option('-o, --output <file>', 'Output SBOM file path')
  .action(generateAction);

program
  .command('validate')
  .description('Validate an SBOM against CycloneDX 1.6 and BSI TR-03183-2')
  .argument('<path>', 'Path to the SBOM file')
  .action(validateAction);

program
  .command('audit')
  .description('Audit an SBOM for BSI compliance and identify gaps')
  .argument('<path>', 'Path to the SBOM file')
  .option('--output-dir <dir>', 'Directory to save audit reports')
  .option('--format <format>', 'Output format (markdown, json, both)', 'both')
  .action(auditAction);

program.parse();
