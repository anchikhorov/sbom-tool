import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateSbom } from '../core/validation.js';

/**
 * Action for the validate command.
 * @param {string} sbomPath Path to the SBOM file.
 */
export async function validateAction(sbomPath) {
  const absPath = resolve(sbomPath);
  
  if (!existsSync(absPath)) {
    console.error(`Error: SBOM file not found: ${absPath}`);
    process.exit(1);
  }

  try {
    const sbom = JSON.parse(readFileSync(absPath, 'utf8'));
    console.log(`\nValidating SBOM: ${absPath}...`);
    
    const result = await validateSbom(sbom);
    
    if (result.valid) {
      console.log('✅ SBOM is valid according to CycloneDX 1.6 and BSI TR-03183-2.');
    } else {
      console.error('❌ SBOM validation failed:');
      result.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error during validation: ${error.message}`);
    process.exit(1);
  }
}
