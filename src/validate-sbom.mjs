/**
 * BSI TR-03183-2 Taxonomy & CycloneDX Structural Linter
 * * DISCLAIMER:
 * PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 * This tool performs technical taxonomy validation ONLY.
 * It is NOT a substitute for a professional legal or security audit.
 * It does NOT verify the completeness or truthfulness of the component list.
 * Passing this check does not guarantee regulatory compliance.
 */

import fs from 'node:fs';

const BSI_PROPS_REPO = "https://raw.githubusercontent.com/BSI-Bund/tr-03183-cyclonedx-property-taxonomy/refs/heads/main/README.md";
const SPDX_LICENSE_LIST = "https://raw.githubusercontent.com/spdx/license-list-data/refs/heads/main/json/licenses.json";

const DISCLAIMER = `
******************************************************************
!!! ATTENTION: TECHNICAL TAXONOMY VALIDATION ONLY!!!
This tool ONLY checks the JSON structure and field format
for compliance with BSI TR-03183-2 requirements.
1. This is NOT a security audit or compliance certification.
2. The tool does NOT verify the accuracy or completeness of the data.
3. A successful validation does NOT guarantee legal compliance.
4. Provided "AS IS" without any obligations.
****************************************************************
`;

async function runValidator(sbomPath) {
    console.log(DISCLAIMER)

    try {
        // 1. Fetching external reference data
        console.log("[*] Sourcing official SPDX license identifiers...");
        const spdxRes = await fetch(SPDX_LICENSE_LIST);
        const spdxData = await spdxRes.json();
        const validSpdxIds = new Set(spdxData.licenses.map(l => l.licenseId));

        // 2. Loading the local SBOM file
        if (!fs.existsSync(sbomPath)) {
            throw new Error(`File not found at: ${sbomPath}`);
        }
        const sbom = JSON.parse(fs.readFileSync(sbomPath, 'utf8'));
        const errors = [];

        console.log(`[*] Auditing SBOM structure for: ${sbom.metadata?.component?.name || 'Unknown Project'}\n`);

        if (!sbom.components || !Array.isArray(sbom.components)) {
            throw new Error("Invalid SBOM: 'components' array is missing or empty.");
        }

        // CHECK: SBOM-level Role validation (BSI TR Section 5)
        const topLevelSupplier = !!sbom.metadata?.supplier;
        const topLevelManufacturer = !!sbom.metadata?.manufacturer || !!sbom.metadata?.manufacture || !!sbom.metadata?.component?.manufacturer;
        const topLevelAuthor = sbom.metadata?.authors && sbom.metadata.authors.length > 0;
        
        if (!topLevelSupplier && !topLevelManufacturer && !topLevelAuthor) {
            errors.push(`[Global]: Missing top-level role information in metadata (supplier, manufacturer, or authors). BSI TR-03183-2 requires identifying the SBOM Creator.`);
        }

        // 3. Iterating through components to check MUST-fields and BSI properties
        sbom.components.forEach(comp => {
            const componentId = comp["bom-ref"] || comp.name || "Unknown";

            // CHECK: Mandatory SHA-512 hash (BSI TR Section 8.2)
            const hasSha512 = comp.hashes?.some(h => h.alg === 'SHA-512');
            if (!hasSha512) {
                errors.push(`[${componentId}]: Missing required SHA-512 hash.`);
            }

            // CHECK: Role validation (BSI TR Section 3.2.9)
            // BSI-TR distinguishes between Vendor/Supplier and Creator (Author/Manufacturer)
            const hasSupplier = !!comp.supplier;
            const hasManufacturer = !!comp.manufacturer;
            const hasAuthor = !!comp.author;
            
            if (!hasSupplier && !hasManufacturer && !hasAuthor) {
                errors.push(`[${componentId}]: Missing role information (supplier, manufacturer, or author). BSI TR-03183-2 requires capturing the component creator or vendor.`);
            }

            // CHECK: SPDX License Identifier (BSI TR Section 6.1) [cite: 13, 15]
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
            
            // 8.1.6 Actual Filename property [cite: 143]
            const hasFilename = properties.some(p => p.name === 'bsi:component:filename');
            if (!hasFilename) {
                errors.push(`[${componentId}]: Missing BSI property 'bsi:component:filename'.`);
            }

            // 8.1.7 Executable property [cite: 143, 151]
            const hasExecutable = properties.some(p => p.name === 'bsi:component:executable');
            if (!hasExecutable) {
                errors.push(`[${componentId}]: Missing BSI property 'bsi:component:executable'.`);
            }

            // Optional check for Acknowledgement (seen in your rowe-ui-bom.txt) [cite: 2, 7]
            const hasAck = properties.some(p => p.name === 'bsi:license:acknowledgement');
            if (!hasAck) {
                // Not strictly MUST in 2.1.0, but recommended for completeness
                console.warn(`[!] Warning: [${componentId}] lacks 'bsi:license:acknowledgement'.`);
            }
        });

        // 4. Graph Integrity Check
        if (!sbom.dependencies || sbom.dependencies.length === 0) {
            errors.push("[Global]: Dependency graph is empty. Relationship mapping is required.");
        }

        // Final Report
        if (errors.length > 0) {
            console.error("\x1b[31m\n❌ TAXONOMY VALIDATION FAILED:\x1b[0m");
            errors.forEach(err => console.error(`  - ${err}`));
            console.log("\nReview the errors above against BSI TR-03183-2 specifications.");
            process.exit(1);
        } else {
            console.log("\x1b[32m\n✅ TAXONOMY VALIDATION PASSED (Structural only).\x1b[0m");
            console.log("Note: This does not verify the actual safety or completeness of the components.");
        }

    } catch (error) {
        console.error(`\nCRITICAL ERROR: ${error.message}`);
        process.exit(1);
    }
}

// Execution
const target = process.argv[2] || 'sbom.json';
runValidator(target);
