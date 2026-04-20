# SBOM Tool Roadmap

## Phase 1: Project Formalization & CLI Refactoring

**Goal:** Transform standalone scripts into a professional, testable, and maintainable Node.js tool for BSI-compliant SBOM generation and validation.

**Requirements:** [FORM-01, STRUC-01, CORE-01, VAL-01, TAXO-01, CLI-01, CONF-01, TEST-01]

**Plans:** 4 plans
- [x] 01-01-PLAN.md — Project Initialization & Foundation
- [x] 01-02-PLAN.md — Core Logic: Enrichment & Classification
- [x] 01-03-PLAN.md — Validation Logic & Schema Bundling
- [x] 01-04-PLAN.md — CLI Interface & Configuration Discovery

## Phase 2: Master Orchestrator & Advanced Enrichment

**Goal:** Implement the "Ideal Script Algorithm" with autonomous enrichment, dynamic taxonomy validation, and robust environment management.

**Requirements:** [ENR-01, TAXO-02, ORCH-01, ORCH-02, CONF-02, VAL-02]

**Plans:** 4 plans
- [x] 02-01-PLAN.md — Foundation & Pre-flight
- [x] 02-02-PLAN.md — Dynamic Taxonomy & Enrichment Providers
- [x] 02-03-PLAN.md — Environment Isolation & Master Loop
- [x] 02-04-PLAN.md — CLI Integration & Verification

## Phase 3: Audit & Verification Workflow

**Goal:** Implement the `audit` command and modular rules engine to facilitate manual review of SBOMs as required by BSI TR-03183-2 §5.1.

**Requirements:** [AUDIT-01, AUDIT-02, REPORT-01, REPORT-02, CLI-03]

**Plans:** 3 plans
- [x] 03-01-PLAN.md — Modular Audit Engine
- [x] 03-02-PLAN.md — Report Generators
- [ ] 03-03-PLAN.md — CLI Command & Integration
