# Phase 3: Audit & Verification Workflow - Execution Plan

This document provides a high-level overview of the implementation plan for Phase 3. For detailed execution steps, refer to the individual plan files in `.planning/phases/03-audit-workflow/`.

## Objective
Implement the `audit` command and modular rules engine to facilitate manual review of SBOMs as required by BSI TR-03183-2 §5.1.

## Implementation Roadmap

### Wave 1: Core Audit Engine
- **Plan 03-01: Modular Audit Engine**
    - Implement `src/core/audit.js` as a modular rules runner.
    - Implement rules for Field Completeness (`NOASSERTION`, `LicenseRef-ROWE-Unknown`).
    - Implement rules for Hash Integrity (`bsi:hash-source: calculated`).
    - Implement rules for Aggregate Status and BSI compliance gaps.
    - Comprehensive unit tests for all audit rules.

### Wave 2: Reporting (Parallelizable with Wave 1 foundation)
- **Plan 03-02: Report Generators**
    - Implement `src/utils/reports.js` using native template literals.
    - Support Markdown format for human review (summary + findings table).
    - Support JSON format for CI/CD integration.
    - Unit tests for report consistency.

### Wave 3: CLI Integration
- **Plan 03-03: CLI Command & Integration**
    - Implement `audit` command in `src/commands/audit.js` using `commander.js`.
    - Integrate existing structural validation (`src/core/validation.js`) as Phase 0.
    - Connect engine and report generators to the CLI action.
    - End-to-end verification and CLI tests.

## Validation & Verification
All Phase 3 work must adhere to the validation strategy:
- **AUDIT-01/02:** 100% detection of targeted fields in test vectors.
- **REPORT-01/02:** Valid JSON and readable Markdown output.
- **CLI-03:** Command-line options handle output directory creation and format selection correctly.

## Key Decisions
- **Native Templates:** Use ES6 template literals for report generation to minimize dependencies.
- **Modular Rules:** Each audit rule is an independent function for easy extensibility.
- **Integrated Validation:** The `audit` command automatically performs a schema validation check before running compliance rules.
- **No-OPA:** Avoid heavy policy engines (like OPA/Rego) for this CLI tool to maintain portability.
- **Stable Identifiers:** Use PURLs in audit findings to ensure location references remain valid across SBOM updates.

## Detailed Plan Files
1. [03-01-PLAN.md](../phases/03-audit-workflow/03-01-PLAN.md)
2. [03-02-PLAN.md](../phases/03-audit-workflow/03-02-PLAN.md)
3. [03-03-PLAN.md](../phases/03-audit-workflow/03-03-PLAN.md)
