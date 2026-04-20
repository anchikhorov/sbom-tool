# Phase 2 — Master Orchestrator & Advanced Enrichment

## Overview
Implementation of the "Ideal Script Algorithm" for autonomous, high-integrity SBOM generation. This phase focuses on external data sourcing (NPM Registry), dynamic taxonomy parsing from BSI's official repository, and robust pre-flight environment management.

## Implementation Decisions

### 1. Advanced Enrichment Loop (The "Gold Standard")
- **Tier 1 (NPM Registry):** Fetch `dist.integrity` (SHA-512) and official license metadata from `https://registry.npmjs.org/[name]/[version]`. This is the authoritative source for external packages.
- **Tier 2 (Local Disk):** Fallback to `node_modules/[package]/package.json` for license discovery.
- **Tier 3 (Git/Source):** Metadata extraction from project-linked Git repositories for internal dependencies.
- **Tier 4 (Calculated Fallback):** Local SHA-512 calculation with property `bsi:hash-source: calculated` if all remote/disk lookups fail.

### 2. Dynamic BSI Taxonomy Validation
- **Source:** `https://raw.githubusercontent.com/BSI-Bund/tr-03183-cyclonedx-property-taxonomy/main/README.md`.
- **Logic:** Implement a parser that extracts allowed `bsi:*` properties from the Markdown tables to ensure compliance with the latest regulator requirements without manual tool updates.
- **Offline Fallback:** Maintain a cached version of the taxonomy rules within the package.

### 3. Orchestrator Orchestration (Setup & Pre-flight)
- **Tool Management:** Automatic check and local installation of `cdxgen` if not found in PATH.
- **Environment Isolation:** Enhanced isolation logic to handle diverse project types (NPM, Maven, Python).

### 4. Patching & Polish
- **License Handling:** Assign `LicenseRef-ROWE-Unknown` only as a last resort.
- **Schema Integrity:** Strict CycloneDX 1.6 validation before and after BSI enrichment.

## Success Criteria
- [ ] Successfully fetch SHA-512 from NPM Registry for 100% of external packages.
- [ ] Dynamic BSI Taxonomy parsing passes on official BSI README.md.
- [ ] Tool performs "Setup & Pre-flight" on clean environments.
- [ ] Final SBOM passes double validation (Schema + Dynamic BSI Rules).
