# Architecture

**Analysis Date:** 2025-01-24

## Pattern Overview

**Overall:** CLI Scripting Architecture

**Key Characteristics:**
- **Procedural Workflow:** Sequential execution of tasks (isolation, generation, enrichment, validation).
- **Tool Orchestration:** Leverages external CycloneDX generators (`cdxgen` or `cyclonedx-npm`).
- **Compliance-Driven Enrichment:** Post-processes raw SBOM data to meet BSI TR-03183-2 v2.1.0 requirements.
- **Independent Validation:** Separated validation logic that fetches live SPDX data for accuracy.

## Layers

**Generation Layer:**
- Purpose: Produces enriched SBOM files from source code.
- Location: `generate-sbom.mjs`
- Contains: Project isolation logic, tool management, raw generation, and BSI enrichment.
- Depends on: `child_process` (for running tools), `fs` (for file ops), external tools (`cdxgen`).
- Used by: End-users/CI pipelines via CLI.

**Validation Layer:**
- Purpose: Ensures SBOM files comply with structural and taxonomy requirements.
- Location: `validate-sbom.mjs`
- Contains: Structural linting, license validation, and BSI property checks.
- Depends on: `node:fs`, external network (SPDX license list).
- Used by: End-users/CI pipelines to verify generated artifacts.

## Data Flow

**SBOM Generation Flow:**

1. **Isolation:** Source project is copied to a temporary directory (`/tmp`) excluding build artifacts.
2. **Tool Check:** Verifies availability of `cdxgen` or `cyclonedx-npm`, installing them if necessary.
3. **Raw Generation:** Executes the generator tool to create a base CycloneDX JSON.
4. **Post-Processing (Enrichment):**
    - Metadata cleanup (removing tool-specific non-standard fields).
    - Timestamp and creator identification update.
    - Component classification (executable, archive, structured).
    - License normalization and BSI acknowledgement tagging.
    - Hash verification and distribution URL derivation.
5. **Output:** Saves the final compliant SBOM to disk.

**SBOM Validation Flow:**

1. **Setup:** Fetches the official SPDX license list and BSI property README (planned/referenced).
2. **Load:** Reads the target SBOM JSON file.
3. **Role Check:** Validates metadata for creator/manufacturer information.
4. **Component Audit:** Iterates through each component to verify:
    - SHA-512 hashes.
    - Creator/Vendor roles.
    - Valid SPDX license IDs.
    - Required BSI properties (`bsi:component:filename`, `executable`, etc.).
5. **Graph Audit:** Verifies the presence of a dependency graph.

## Key Abstractions

**Enrichment Functions:**
- Purpose: Logic to map raw component data to BSI-required fields.
- Examples: `enrichComponent` and `classifyComponent` in `generate-sbom.mjs`.
- Pattern: Mutative post-processing of JSON objects.

**Validation Rules:**
- Purpose: Rule-based checks for SBOM compliance.
- Examples: Checks within `runValidator` in `validate-sbom.mjs`.
- Pattern: Collection of error strings during iteration.

## Entry Points

**Generator CLI:**
- Location: `generate-sbom.mjs`
- Triggers: Manual execution or CI/CD stage.
- Responsibilities: End-to-end SBOM creation.

**Validator CLI:**
- Location: `validate-sbom.mjs`
- Triggers: Post-generation check or pre-distribution gate.
- Responsibilities: Compliance verification.

## Error Handling

**Strategy:** Fail-fast with descriptive console output.

**Patterns:**
- **Command Failure:** `run()` helper in `generate-sbom.mjs` throws on non-zero exit codes.
- **Validation Failure:** `validate-sbom.mjs` collects all errors and exits with code 1 if any are found.

## Cross-Cutting Concerns

**Logging:** Standard console output (`console.log`, `console.error`) with some ANSI coloring in validation.
**Validation:** Structural validation via heuristics and external reference data.
**Authentication:** Environment-variable based (`SBOM_CREATOR_EMAIL`).

---

*Architecture analysis: 2025-01-24*
