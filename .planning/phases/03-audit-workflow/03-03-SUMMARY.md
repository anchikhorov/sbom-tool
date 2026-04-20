---
phase: 03-audit-workflow
plan: 03-03
subsystem: CLI
tags: [cli, audit, integration]
requirements: [CLI-03]
requires: [03-01, 03-02]
provides: [audit-command]
affects: [bin/sbom-tool.mjs, src/commands/audit.js]
tech-stack: [commander.js, node:fs]
key-files: [src/commands/audit.js, bin/sbom-tool.mjs, tests/commands/audit.test.js]
decisions:
  - D-16: Combine validation errors and audit findings in a single report for unified compliance assessment.
metrics:
  duration: 15m
  completed_date: "2026-04-20"
---

# Phase 3 Plan 03: CLI Command & Integration Summary

The `audit` command has been successfully implemented and integrated into the `sbom-tool` CLI. This command provides the end-user interface for the audit workflow, allowing users to verify SBOM compliance with BSI TR-03183-2.

## Key Changes

### CLI Command Implementation
- Created `src/commands/audit.js` with `auditAction` using `commander.js`.
- Registered the `audit` command in `bin/sbom-tool.mjs`.
- Supported options for `--output-dir` and `--format` (markdown, json, both).
- Handled file I/O errors and invalid JSON gracefully.

### Integration
- Integrated `validateSbom` from `src/core/validation.js` as the first step of the audit.
- Mapped validation errors to a unified finding format (`VALIDATION-ERROR` rule ID).
- Integrated `runAudit` from `src/core/audit.js` for compliance checking.
- Automated report generation using `src/utils/reports.js`.

## Verification Results

### Automated Tests
- `tests/commands/audit.test.js` passed with 100% success.
- Verified that command accepts input and options.
- Verified that reports are generated in the specified formats.
- Verified that validation errors and audit findings are both included in the reports.

### Manual Verification
- Ran `node bin/sbom-tool.mjs audit project-bom.json --output-dir ./test-audit/`.
- Verified that reports correctly identified an `incomplete` composition in `project-bom.json`.
- Verified that structural and taxonomy errors are correctly identified and reported alongside compliance issues.

## Deviations from Plan

None - plan executed exactly as written.

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: Path Traversal | src/commands/audit.js | The command writes reports to a directory specified by the user via `--output-dir`. While it uses `path.resolve`, it does not restrict writing outside of a safe workspace. This is expected behavior for a CLI tool but should be noted. |

## Self-Check: PASSED
- [x] Created `src/commands/audit.js`
- [x] Modified `bin/sbom-tool.mjs`
- [x] Created `tests/commands/audit.test.js`
- [x] All tests passed
- [x] Commits made with proper format
- [x] Verified with manual run
