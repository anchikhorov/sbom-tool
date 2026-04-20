# Phase 2 — Master Orchestrator & Advanced Enrichment

## Overview
Implementation of the "Ideal Script Algorithm" for autonomous, high-integrity SBOM generation. This phase focuses on external data sourcing (NPM Registry), dynamic taxonomy parsing from BSI's official repository, and robust pre-flight environment management.

## Goals
1.  **Advanced Enrichment Loop:** Implement the tiered enrichment strategy (NPM Registry, Local Disk, Git Metadata, Local Calculation).
2.  **Dynamic BSI Taxonomy Validation:** Implement a parser that fetches the latest allowed `bsi:*` properties from the official BSI GitHub repository.
3.  **Orchestrator Orchestration:** Enhance pre-flight checks (automatic check and local installation of `cdxgen`) and environment isolation (NPM, Maven, Python).
4.  **Patching & Polish:** Improve license handling and ensure strict CycloneDX 1.6 validation.

## Plans

### [Plan 02-01: Foundation & Pre-flight](.planning/phases/02-advanced-enrichment/02-01-PLAN.md)
**Wave:** 1
**Objective:** Establish the foundation for pre-flight checks, local tool management, hash calculation, and configuration environment fallbacks.

**Tasks:**
1.  **Pre-flight Utilities:** Implement `src/utils/preflight.js` with cross-platform `cdxgen` detection and local installation (no global flags).
2.  **Local Hash Tier:** Implement `src/utils/hash.js` for SHA-512 calculation.
3.  **Config Env Support:** Update `src/utils/config.js` to support environment variable fallbacks.

### [Plan 02-02: Dynamic Taxonomy & Enrichment Providers](.planning/phases/02-advanced-enrichment/02-02-PLAN.md)
**Wave:** 2
**Objective:** Implement the dynamic taxonomy parser and individual enrichment providers (Tiers 1-3).

**Tasks:**
1.  **Dynamic BSI Parser:** Implement `src/utils/taxonomy-parser.js` with GitHub fetching and regex extraction.
2.  **NPM Registry Provider:** Implement `src/core/enrichment/npm-provider.js` (Tier 1).
3.  **Local & Git Providers:** Implement `src/core/enrichment/local-provider.js` (Tier 2) and `src/core/enrichment/git-provider.js` (Tier 3).

### [Plan 02-03: Environment Isolation & Master Loop](.planning/phases/02-advanced-enrichment/02-03-PLAN.md)
**Wave:** 3
**Objective:** Implement the tiered enrichment loop, dynamic validation, and environment isolation logic.

**Tasks:**
1.  **Master Enrichment Loop:** Refactor `src/core/enrichment.js` with the tiered strategy (Tiers 1-4).
2.  **Dynamic Validation:** Update `src/core/validation.js` to use the dynamic taxonomy parser.
3.  **Environment Isolation Logic:** Implement logic to handle diverse project types (NPM, Maven, Python) via temporary workspaces.

### [Plan 02-04: CLI Integration & Verification](.planning/phases/02-advanced-enrichment/02-04-PLAN.md)
**Wave:** 4
**Objective:** Integrate all providers into the master CLI workflow and verify the full flow.

**Tasks:**
1.  **CLI Master Orchestration:** Update `src/commands/generate.js` to orchestrate pre-flight, isolation, generation, enrichment, and validation.
2.  **Phase 2 Verification:** Perform final phase verification with a human checkpoint.

## Verification
-   **Enrichment:** Successfully fetch SHA-512 from NPM Registry for 100% of external packages.
-   **Taxonomy:** Dynamic BSI Taxonomy parsing passes on official BSI README.md.
-   **Pre-flight:** Tool performs local installation of `cdxgen` into `tools/` if missing.
-   **Isolation:** Workspace isolation correctly handles manifest-only generation for diverse types.
-   **Compliance:** Final SBOM passes double validation (Schema + Dynamic BSI Rules).
