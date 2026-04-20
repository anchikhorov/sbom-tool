---
phase: 01-project-formalization
plan: 04
subsystem: CLI
tags: [commander, config, cli]
requires: [01-01, 01-02, 01-03]
provides: [CLI-01, CONF-01]
affects: [bin/sbom-tool.mjs, src/commands/generate.js, src/commands/validate.js, src/utils/config.js]
tech-stack: [commander, cdxgen, ajv]
key-files:
  - bin/sbom-tool.mjs
  - src/commands/generate.js
  - src/commands/validate.js
  - src/utils/config.js
decisions:
  - Use commander.js for CLI structure.
  - Implement sbom.config.json for auto-discovery.
  - Port isolation and generation logic to new command structure.
metrics:
  duration: 15m
  completed_date: "2026-04-20"
---

# Phase 01 Plan 04: CLI Interface & Config Discovery Summary

Implemented a unified CLI for SBOM generation and validation using `commander.js` and configuration discovery.

## Accomplishments

- **Unified CLI:** Created `bin/sbom-tool.mjs` with `generate` and `validate` commands.
- **Config Discovery:** Implemented `src/utils/config.js` to load settings from `sbom.config.json` and environment variables.
- **Improved Generate Command:** Refined the generation logic with better project isolation and tool detection.
- **Clean Validation:** Enhanced validation logic to silence noisy schema warnings for a professional CLI experience.
- **Integration Tests:** Added `tests/cli.test.js` using Vitest with complex mocking for `node:fs` and `node:child_process` in ESM.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Silence cdxgen check noise**
- **Found during:** Verification
- **Issue:** `capture` function for tool discovery leaked `No such file or directory` to stderr when checking non-standard paths.
- **Fix:** Added `stdio: ["ignore", "pipe", "ignore"]` to `execSync`.
- **Files modified:** `src/commands/generate.js`
- **Commit:** `878ce68`

**2. [Rule 2 - UX] Silence Ajv format warnings**
- **Found during:** Verification
- **Issue:** CLI output was cluttered with `unknown format "iri-reference"` warnings from Ajv.
- **Fix:** Added a silent logger to Ajv options.
- **Files modified:** `src/core/validation.js`
- **Commit:** `878ce68`

## Verification Results

- `npx vitest tests/cli.test.js`: All 4 tests PASSED.
- `node bin/sbom-tool.mjs generate . -o project-bom.json`: SBOM generated and enriched successfully.
- `node bin/sbom-tool.mjs validate project-bom.json`: SBOM validated successfully with clean output.

## Self-Check: PASSED
- Created files exist: `bin/sbom-tool.mjs`, `src/commands/generate.js`, `src/commands/validate.js`, `src/utils/config.js`, `tests/cli.test.js`.
- Commits exist: `80ad08a`, `1159eef`, `878ce68`.
