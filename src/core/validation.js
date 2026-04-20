import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../../schemas/bom-1.6.schema.json' with { type: 'json' };
import spdxSchema from '../../schemas/spdx.schema.json' with { type: 'json' };
import jsfSchema from '../../schemas/jsf-0.82.schema.json' with { type: 'json' };
import spdxLicenses from '../../schemas/spdx-licenses.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Add supporting schemas
ajv.addSchema(spdxSchema, 'spdx.schema.json');
ajv.addSchema(jsfSchema, 'jsf-0.82.schema.json');

const validateStructure = ajv.compile(schema);

const validSpdxIds = new Set(spdxLicenses.licenses.map(l => l.licenseId));

/**
 * Validates an SBOM against CycloneDX 1.6 schema and BSI TR-03183-2 taxonomy.
 * @param {Object} sbom The SBOM object to validate.
 * @returns {Promise<{valid: boolean, errors: string[]}>}
 */
export async function validateSbom(sbom) {
  const errors = [];

  // 1. Structural Validation
  const isStructureValid = validateStructure(sbom);
  if (!isStructureValid) {
    validateStructure.errors.forEach(err => {
      errors.push(`[Structure]: ${err.instancePath} ${err.message}`);
    });
  }

  // 2. Taxonomy Validation (BSI TR-03183-2)
  
  // CHECK: SBOM-level Role validation (BSI TR Section 5)
  const topLevelSupplier = !!sbom.metadata?.supplier;
  const topLevelManufacturer = !!sbom.metadata?.manufacturer || !!sbom.metadata?.manufacture || !!sbom.metadata?.component?.manufacturer;
  const topLevelAuthor = sbom.metadata?.authors && sbom.metadata.authors.length > 0;
  
  if (!topLevelSupplier && !topLevelManufacturer && !topLevelAuthor) {
    errors.push(`[Global]: Missing top-level role information in metadata (supplier, manufacturer, or authors). BSI TR-03183-2 requires identifying the SBOM Creator.`);
  }

  // CHECK: Dependency graph (BSI TR Section 4)
  if (!sbom.dependencies || sbom.dependencies.length === 0) {
    errors.push("[Global]: Dependency graph is empty. Relationship mapping is required.");
  }

  // Component-level checks
  if (sbom.components && Array.isArray(sbom.components)) {
    sbom.components.forEach(comp => {
      const componentId = comp["bom-ref"] || comp.name || "Unknown";

      // CHECK: Mandatory SHA-512 hash (BSI TR Section 8.2)
      const hasSha512 = comp.hashes?.some(h => h.alg === 'SHA-512');
      if (!hasSha512) {
        errors.push(`[${componentId}]: Missing required SHA-512 hash.`);
      }

      // CHECK: Role validation (BSI TR Section 3.2.9)
      const hasSupplier = !!comp.supplier;
      const hasManufacturer = !!comp.manufacturer;
      const hasAuthor = !!comp.author;
      
      if (!hasSupplier && !hasManufacturer && !hasAuthor) {
        errors.push(`[${componentId}]: Missing role information (supplier, manufacturer, or author). BSI TR-03183-2 requires capturing the component creator or vendor.`);
      }

      // CHECK: SPDX License Identifier (BSI TR Section 6.1)
      if (!comp.licenses || comp.licenses.length === 0) {
        errors.push(`[${componentId}]: No license information provided.`);
      } else {
        comp.licenses.forEach(entry => {
          const lic = entry.license;
          if (lic) {
            if (lic.name && !lic.id) {
              errors.push(`[${componentId}]: License text/name provided ("${lic.name}"), but MUST use SPDX ID.`);
            }
            if (lic.id && !validSpdxIds.has(lic.id)) {
              errors.push(`[${componentId}]: Invalid SPDX ID detected: "${lic.id}".`);
            }
          } else if (!entry.expression) {
            errors.push(`[${componentId}]: License entry missing both 'license' and 'expression'.`);
          }
        });
      }

      // CHECK: BSI Binary Properties (BSI TR Sections 8.1.6 & 8.1.7) 
      const properties = comp.properties || [];
      const hasFilename = properties.some(p => p.name === 'bsi:component:filename');
      if (!hasFilename) {
        errors.push(`[${componentId}]: Missing BSI property 'bsi:component:filename'.`);
      }

      const hasExecutable = properties.some(p => p.name === 'bsi:component:executable');
      if (!hasExecutable) {
        errors.push(`[${componentId}]: Missing BSI property 'bsi:component:executable'.`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
