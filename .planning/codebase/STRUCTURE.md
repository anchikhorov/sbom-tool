# Codebase Structure

**Analysis Date:** 2025-01-24

## Directory Layout

```
generate-sbom/
├── generate-sbom.mjs     # Primary SBOM generator tool
├── validate-sbom.mjs     # SBOM compliance validator
├── README.md             # Usage and documentation
├── result.txt            # Results or execution log
├── rowe-ui-bom.json      # Sample generated SBOM (frontend)
├── rowe-cp-bom.json      # Sample generated SBOM (backend)
├── ScanInterface-bom.json # Sample generated SBOM (interface)
└── .planning/            # Project planning and knowledge graph
    └── codebase/         # Architecture, structure, and quality docs
```

## Directory Purposes

**Root:**
- Purpose: Contains all the execution scripts and generated artifacts.
- Contains: JavaScript (`.mjs`) scripts, JSON documents, and Markdown documentation.
- Key files: `generate-sbom.mjs`, `validate-sbom.mjs`.

**.planning/codebase/:**
- Purpose: Stores project-level analysis and documentation consumed by AI agents.
- Contains: ARCHITECTURE.md, STRUCTURE.md, STACK.md, etc.
- Key files: `ARCHITECTURE.md`.

## Key File Locations

**Entry Points:**
- `generate-sbom.mjs`: Entry point for generating an SBOM.
- `validate-sbom.mjs`: Entry point for validating an SBOM.

**Configuration:**
- `generate-sbom.mjs` (Config section): Hardcoded configuration for tools, creator identification, and excluded directories.

**Core Logic:**
- `generate-sbom.mjs`: Contains the logic for enrichment and classification.
- `validate-sbom.mjs`: Contains the validation rules and structural checks.

**Testing/Samples:**
- `rowe-ui-bom.json`, `rowe-cp-bom.json`, `ScanInterface-bom.json`: Real-world output samples.

## Naming Conventions

**Files:**
- [Kebab-case]: Scripts follow kebab-case with the `.mjs` extension (e.g., `generate-sbom.mjs`).
- [Suffix]: Generated SBOM files are suffixed with `-bom.json`.

**Directories:**
- [Standard]: Planning directories follow `.planning/codebase/`.

## Where to Add New Code

**New Generation Logic:**
- Primary code: Add to the post-processing section in `generate-sbom.mjs`.
- Enrichment rules: Update `enrichComponent` or `classifyComponent`.

**New Validation Rule:**
- Implementation: Add to the `runValidator` function in `validate-sbom.mjs`.

**Shared Helpers:**
- If shared utility functions are needed across both scripts, they should be extracted to a new file (e.g., `utils.mjs`).

## Special Directories

**/tmp/[projectName]-sbom-isolated:**
- Purpose: Temporary project isolation for generation.
- Generated: Yes (during generation).
- Committed: No.

---

*Structure analysis: 2025-01-24*
