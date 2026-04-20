# Phase 1 — Project Formalization & CLI Refactoring

## Overview
This phase formalizes the existing standalone scripts into a professional, testable, and maintainable Node.js tool for BSI-compliant SBOM generation and validation.

## Implementation Decisions

### 1. Project Structure (Formalization)
- **Package Name:** `@rowe/sbom-tool`
- **Module Type:** **ESM** (strictly using `import/export`).
- **Standard Layout:**
  - `src/`: Core logic (enrichment, validation, classification).
  - `bin/`: CLI entry point (`sbom-tool`).
  - `tests/`: Unit and integration tests.
  - `schemas/`: Bundled CycloneDX schemas.

### 2. CLI & Interface
- **Library:** **`commander.js`** will be used to manage CLI commands.
- **Commands:**
  - `generate`: Handles project isolation, `cdxgen` invocation, and BSI enrichment.
  - `validate`: Performs structural and schema validation.
- **Argument Parsing:** Support for positional paths and flagged options (e.g., `--output`, `--config`).

### 3. Testing Strategy
- **Runner:** **`Vitest`** for its speed, ESM support, and built-in mocking capabilities.
- **Priority:** 
  - Mocking `cdxgen` outputs to test the **BSI enrichment logic** (Step 4 of the current script).
  - Verifying classification heuristics (executable vs. archive).
  - Validating final JSON structure against expectations.

### 4. Configuration Management
- **Primary Format:** **`sbom.config.json`**.
- **Auto-Discovery:** The tool will automatically look for `sbom.config.json` in the Current Working Directory (CWD).
- **Environment Fallback:** Maintain support for `SBOM_CREATOR_EMAIL` and `SBOM_CREATOR_URL` for CI/CD flexibility.

### 5. Validation Enhancement
- **Schema Handling:** **Bundle the CycloneDX 1.6 JSON schema** within the package to ensure reliable validation in offline or restricted environments (e.g., air-gapped CI).
- **Taxonomy Validation:** Extend `validate-sbom.mjs` logic to include strict BSI property checks and SPDX identifier verification.

## Locked Assets (Reusable)
- **Enrichment Logic:** The logic mapping BSI TR-03183-2 §5 to CycloneDX fields in `generate-sbom.mjs`.
- **Classification Heuristics:** The `classifyComponent` function and associated extension lists.
- **SPDX Integration:** The remote license list fetching pattern (to be converted to a cached/bundled resource if needed).

## Next Steps
- [x] Create `1-CONTEXT.md`
- [ ] Research specific `cdxgen` edge cases for the refactor (`gsd-phase-researcher`).
- [ ] Draft execution plan for the refactor (`gsd-planner`).
