# Phase 1 Validation Plan — Project Formalization & CLI Refactoring

This document defines the validation criteria, testing strategy, and compliance checks for Phase 1. It ensures the formalization of the SBOM tool meets both technical and regulatory (BSI) requirements.

## 1. Success Criteria

Phase 1 is considered successful when:

### Technical Success
- [ ] **ESM Package Architecture:** The codebase is successfully refactored into a standard Node.js ESM package with a clear separation of concerns (`src/`, `bin/`, `schemas/`).
- [ ] **Unified CLI:** A single entry point (`sbom-tool`) provides robust `generate` and `validate` commands with proper argument parsing (via `commander.js`).
- [ ] **Configuration Discovery:** The tool correctly identifies and applies `sbom.config.json` settings and environment variable fallbacks.
- [ ] **Test Coverage:** Core logic (enrichment, classification, validation) has >90% unit test coverage.
- [ ] **Offline Readiness:** CycloneDX 1.6 schemas are bundled and used for validation without requiring internet access.

### Functional Success
- [ ] **Reliable Generation:** The `generate` command successfully invokes `cdxgen` and applies BSI enrichment logic to produce a valid SBOM.
- [ ] **Accurate Classification:** The tool correctly identifies components as `executable` or `archive` based on heuristics.
- [ ] **Strict Validation:** The `validate` command identifies both structural (schema) and semantic (BSI property) non-compliances.

## 2. Testing Strategy

We use **Vitest** for its ESM native support and speed.

### 2.1 Unit Testing
- **Target:** `src/core/enrichment.mjs`, `src/core/classification.mjs`, `src/core/validation.mjs`.
- **Approach:** 
    - Pure functions tested with static input/output.
    - Mocking of `node:fs` using `memfs` for configuration loading logic.
- **Key Test Cases:**
    - BSI §5 mapping: Verify manufacturer, supplier, and product info are correctly injected into metadata.
    - Extension heuristics: Verify `.exe`, `.dll` map to `executable` and `.zip`, `.tar.gz` map to `archive`.
    - License validation: Verify SPDX identifier checks.

### 2.2 Integration Testing
- **Target:** CLI command handlers in `src/commands/`.
- **Approach:**
    - Use `vi.mock('node:child_process')` to simulate `cdxgen` output.
    - Verify command actions correctly chain core logic (generate -> enrich -> validate).
    - Test `sbom.config.json` discovery in various directory depths.

### 2.3 End-to-End (E2E) Testing
- **Target:** `bin/sbom-tool.mjs` execution.
- **Approach:**
    - Execute the CLI against a mock project structure in a temporary directory.
    - Verify final file output exists and matches the expected schema.
- **Command:** `node ./bin/sbom-tool.mjs generate ./tests/fixtures/mock-project -o ./output.json`

## 3. Manual Verification Steps

Perform these steps to verify the CLI from a user's perspective:

### CLI Usage
1. **Help Command:**
   ```bash
   node ./bin/sbom-tool.mjs --help
   ```
   *Expected:* Shows available commands (`generate`, `validate`) and global options.

2. **Generate SBOM:**
   ```bash
   node ./bin/sbom-tool.mjs generate ./ -o test-bom.json
   ```
   *Expected:* Executes `cdxgen`, enriches output, and writes `test-bom.json`.

3. **Validate SBOM:**
   ```bash
   node ./bin/sbom-tool.mjs validate test-bom.json
   ```
   *Expected:* Success message if valid, or detailed error list if invalid.

4. **Configuration Discovery:**
   - Create a `sbom.config.json` in the CWD.
   - Run `generate`.
   - *Expected:* Output metadata reflects settings from the config file.

## 4. Compliance Checks

### 4.1 BSI TR-03183-2 §5 Requirements
The tool must ensure the following fields are present and valid in the produced CycloneDX 1.6 JSON:

| Requirement | Field / Location | Validation Rule |
|-------------|------------------|-----------------|
| Manufacturer Info | `metadata.component.author` | Must not be empty |
| Supplier Info | `metadata.supplier` | Must match config or environment |
| Product Name | `metadata.component.name` | Must be present |
| Product Version | `metadata.component.version` | Must be present |
| Product Hash | `metadata.component.hashes` | Required for binary artifacts |
| Tool Info | `metadata.tools` | Must list `@rowe/sbom-tool` and version |
| Serial Number | `serialNumber` | Must be a valid UUID (urn:uuid:...) |
| Timestamp | `metadata.timestamp` | Must be ISO 8601 format |

### 4.2 CycloneDX 1.6 Schema Compliance
- **Schema:** `http://cyclonedx.org/schema/bom-1.6.schema.json`
- **Check:**
  - Run `ajv` validation against the bundled schema.
  - No `additionalProperties` failures in core components.
  - Proper use of `compositions` for BSI "Vollständigkeitserklärung" (Statement of Completeness).

## 5. Nyquist Compliance (Automated Verification)

| Wave | Task | Automated Verification Command |
|------|------|---------------------------------|
| 0 | Setup Testing | `npx vitest run tests/setup.test.mjs` |
| 1 | Core Logic | `npx vitest run tests/enrichment.test.mjs` |
| 2 | Validation | `npx vitest run tests/validation.test.mjs` |
| 3 | CLI E2E | `npx vitest run tests/cli.test.mjs` |
| 4 | Final Compliance | `node ./bin/sbom-tool.mjs validate self-generated-bom.json` |
