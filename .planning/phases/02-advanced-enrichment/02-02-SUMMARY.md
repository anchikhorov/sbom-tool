---
phase: 02-advanced-enrichment
plan: 02
subsystem: Enrichment
tags: [bsi, taxonomy, npm, git]
requirements: [ENR-01, TAXO-02]
requires: [02-01]
provides: [bsi-taxonomy, npm-enrichment, git-normalization]
affects: [orchestrator]
tech-stack: [axios, hosted-git-info, vitest]
key-files: [src/utils/taxonomy-parser.js, src/core/enrichment/npm-provider.js, src/core/enrichment/local-provider.js, src/core/enrichment/git-provider.js]
metrics:
  duration: 30m
  completed_date: "2024-05-24"
---

# Phase 02 Plan 02: Dynamic Taxonomy & Providers Summary

Implemented the foundational data sourcing components for the advanced enrichment loop, including the dynamic BSI taxonomy parser and tiered metadata providers (NPM Registry, Local Disk, and Git).

## Key Achievements

- **Dynamic BSI Taxonomy Parser:** Implemented a regex-based parser that fetches and extracts `bsi:*` properties from the official GitHub README. Includes local caching and hardcoded fallbacks for offline reliability.
- **NPM Registry Provider (Tier 1):** Robust provider for fetching authoritative SHA-512 hashes and license metadata from `registry.npmjs.org` with automatic 429 rate-limiting retry logic.
- **Local & Git Providers (Tiers 2-3):** Implemented local `node_modules` license extraction and automated Git URI normalization using `hosted-git-info`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing `hosted-git-info` dependency**
- **Found during:** Task 3
- **Issue:** `hosted-git-info` was mentioned in research but not present in `package.json`.
- **Fix:** Installed `hosted-git-info` as a production dependency.
- **Files modified:** `package.json`, `package-lock.json`
- **Commit:** `44d746c`

**2. [Rule 2 - Missing Critical] Added 429 Retry Logic to NPM Provider**
- **Found during:** Task 2
- **Issue:** NPM registry can rate limit fast requests; basic implementation lacked resilience.
- **Fix:** Implemented `getWithRetry` helper using exponential backoff for 429 errors.
- **Files modified:** `src/core/enrichment/npm-provider.js`
- **Commit:** `4c24dd0`

## Known Stubs

None - all providers and parser are fully implemented and verified via unit tests.

## Self-Check: PASSED
- [x] Taxonomy parser extracts properties from mock BSI markdown.
- [x] NPM provider handles scoped packages and retries on 429.
- [x] Git provider correctly normalizes SSH and shorthand URIs.
- [x] All 18 tests (taxonomy + providers) pass.
