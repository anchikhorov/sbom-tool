#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('sbom-tool')
  .description('Enterprise SBOM generation and validation tool')
  .version('0.1.0');

program.parse();
