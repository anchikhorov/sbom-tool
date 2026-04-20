---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: Phase 2 — Master Orchestrator & Advanced Enrichment
status: planning
last_updated: "2026-04-20T12:00:00.000Z"
progress:
  total_phases: 2
  completed_phases: 1
  total_plans: 7
  completed_plans: 4
  percent: 57
---

# SBOM Tool Project State

## Position

**Current Phase:** Phase 2 — Master Orchestrator & Advanced Enrichment
**Status:** Planning

## Decisions

- D-01: Use ESM for all modules (per 1-CONTEXT.md).
- D-02: Use `commander.js` for CLI (per 1-CONTEXT.md).
- D-03: Use `ajv` for JSON schema validation (per 1-RESEARCH.md).
- D-04: Bundle CycloneDX 1.6 schema (per 1-RESEARCH.md).
- D-05: Use `Vitest` for testing (per 1-RESEARCH.md).
- D-06: Package name: `@rowe/sbom-tool` (per 1-CONTEXT.md).
- D-07: Bundle CycloneDX 1.6 and supporting schemas for offline use (Phase 1).
- D-08: Use `axios` for HTTP requests to Registry and GitHub (Phase 2).
- D-09: Use `hosted-git-info` for Git metadata normalization (Phase 2).
- D-10: Use `which` for cross-platform command detection (Phase 2).
- D-11: Implement Tiered Enrichment (Registry -> Local -> Git -> Calculated) (Phase 2).
- D-12: Use dynamic Regex-based parser for BSI taxonomy Markdown (Phase 2).

## Pending Todos

- [ ] Implement pre-flight logic and hash utility.
- [ ] Add environment variable support to config.
- [ ] Implement dynamic BSI taxonomy parser.
- [ ] Implement enrichment providers (NPM, Local, Git).
- [ ] Refactor master enrichment loop with tiered strategy.
- [ ] Update validation to use dynamic taxonomy rules.
- [ ] Integrate into CLI and verify.
