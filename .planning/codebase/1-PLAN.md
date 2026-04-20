# Phase 1: Project Formalization & CLI Refactoring - Execution Plan

This document provides a high-level overview of the implementation plan for Phase 1. For detailed execution steps, refer to the individual plan files in `.planning/phases/01-project-formalization/`.

## Objective
Formalize the existing SBOM scripts into a professional, testable Node.js package (`@rowe/sbom-tool`) with a unified CLI.

## Implementation Roadmap

### Wave 1: Foundation
- **Plan 01-01: Project Initialization & Foundation**
    - Initialize ESM package.json.
    - Set up directory structure (`src/`, `bin/`, `tests/`, `schemas/`).
    - Configure Vitest with **ESM hoisting patterns** for mocking.

### Wave 2: Core Logic Porting (Parallel)
- **Plan 01-02: Core Logic: Enrichment & Classification**
    - Port `classifyComponent` and `enrichSbom` logic.
    - Add unit tests for BSI property mapping.
    - **Ensure full BSI §5 coverage** (serialNumber, timestamp, dependencies, compositions).
- **Plan 01-03: Validation Logic & Schema Bundling**
    - Bundle CycloneDX 1.6 schema.
    - Implement Ajv-based structural and taxonomy validation.
    - Add unit tests for compliance checks.

### Wave 3: Interface & Integration
- **Plan 01-04: CLI Interface & Configuration Discovery**
    - Implement `commander.js` CLI with `generate` and `validate` commands.
    - Support `sbom.config.json` auto-discovery and environment fallback.
    - End-to-end integration testing using **vi.hoisted mocking**.

## Validation & Verification
All Phase 1 work must adhere to the validation strategy defined in:
- **[.planning/phases/01-project-formalization/01-VALIDATION.md](../phases/01-project-formalization/01-VALIDATION.md)**

This includes mandatory Vitest coverage, BSI TR-03183-2 §5 compliance checks, and CycloneDX 1.6 schema validation.

## Key Decisions
- **ESM-First:** Standardized on ES Modules.
- **Ajv Validation:** Robust JSON schema validation for BSI compliance.
- **Bundled Schemas:** Offline support for air-gapped CI environments.
- **TDD:** Focus on test-driven development for core enrichment logic.
- **ESM Mocking:** Use `vi.hoisted` to handle hoisting requirements for Vitest mocks of Node.js built-ins.

## Detailed Plan Files
1. [01-01-PLAN.md](../phases/01-project-formalization/01-01-PLAN.md)
2. [01-02-PLAN.md](../phases/01-project-formalization/01-02-PLAN.md)
3. [01-03-PLAN.md](../phases/01-project-formalization/01-03-PLAN.md)
4. [01-04-PLAN.md](../phases/01-project-formalization/01-04-PLAN.md)
