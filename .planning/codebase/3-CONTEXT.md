# Phase 3 — Audit & Verification Workflow

## Overview
Implementation of the `audit` command to facilitate the manual review process required by BSI TR-03183-2 §5.1. The tool will identify gaps in the generated SBOM, such as missing metadata, unverified hashes, and incomplete dependency aggregates.

## Implementation Decisions

### 1. CLI Interface
- **Command:** `sbom-tool audit <input-file.json>`.
- **Arguments:**
  - `--output-dir <dir>`: Directory to save the audit reports (default: `./audit-reports/`).
  - `--format <format>`: Choice of `markdown`, `json`, or `both` (default: `both`).

### 2. Audit Scope (Rules)
- **Field Completeness:** Flag any `NOASSERTION` values in names, versions, or licenses.
- **Hash Integrity:** Flag components with `bsi:hash-source: calculated` (requiring manual verification against build artifacts).
- **Aggregate Status:** Flag `compositions[].aggregate` if set to `incomplete`.
- **BSI Compliance Gaps:** Identify missing mandatory BSI properties (e.g., `bsi:component:filename`, `bsi:component:effectiveLicence`).
- **License Logic:** Identify components with `LicenseRef-ROWE-Unknown`.

### 3. Report Output
- **Markdown Report (`audit-report.md`):** A human-readable summary with tables of "Gaps found" and "Action items" for the compliance officer.
- **JSON Report (`audit-report.json`):** A machine-readable document containing the same findings for integration into CI/CD quality gates.

### 4. Reusable Assets
- **Validation Logic:** Leverage the existing `src/core/validation.js` logic to identify structural and taxonomy errors.
- **Enrichment Metadata:** Use the `bsi:*` properties added during Phase 2 to determine the source of truth for each field.

## Deferred / Todo for Later
- **Multi-Stack Registry Providers:** Implementation of Maven, PyPI, and Go Proxy providers (deferred to Phase 4).
- **License Risk Analysis:** Automated flagging of copyleft or high-risk licenses.

## Success Criteria
- [ ] `audit` command successfully identifies 100% of `NOASSERTION` and `calculated` fields.
- [ ] Generates valid Markdown and JSON reports concurrently.
- [ ] Provides clear "Action Items" for manual remediation.
