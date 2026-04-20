# SBOM Tool Project State

## Position
**Current Phase:** Phase 1 — Project Formalization & CLI Refactoring
**Status:** Planning

## Decisions
- D-01: Use ESM for all modules (per 1-CONTEXT.md).
- D-02: Use `commander.js` for CLI (per 1-CONTEXT.md).
- D-03: Use `ajv` for JSON schema validation (per 1-RESEARCH.md).
- D-04: Bundle CycloneDX 1.6 schema (per 1-RESEARCH.md).
- D-05: Use `Vitest` for testing (per 1-RESEARCH.md).
- D-06: Package name: `@rowe/sbom-tool` (per 1-CONTEXT.md).

## Pending Todos
- [ ] Initialize package.json.
- [ ] Establish directory structure.
- [ ] Implement core logic in `src/`.
- [ ] Implement CLI in `bin/`.
- [ ] Add unit tests.
