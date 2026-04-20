# Coding Conventions

**Analysis Date:** 2025-04-20

## Naming Patterns

**Files:**
- `kebab-case.mjs`: Node.js scripts using ECMAScript Modules (ESM) (e.g., `generate-sbom.mjs`, `validate-sbom.mjs`).

**Functions:**
- `camelCase` for function names (e.g., `run`, `capture`, `classifyComponent`, `enrichComponent`, `runValidator`).

**Variables:**
- `camelCase` for variable names (e.g., `rawArgs`, `positionalArgs`, `useCyclonedxNpm`).
- `SCREAMING_SNAKE_CASE` for global constants (e.g., `CDXGEN_VERSION`, `EXCLUDED_DIRS`, `SBOM_CREATOR_EMAIL`, `DISCLAIMER`).

**Types:**
- Not explicitly defined (JavaScript project), but implicit object structures follow CycloneDX 1.6 and BSI TR-03183-2 specifications.

## Code Style

**Formatting:**
- **Indentation:** 2 spaces (consistent across `generate-sbom.mjs` and `validate-sbom.mjs`).
- **Quotes:** Single quotes preferred for strings (e.g., `'node:fs'`, `'utf8'`), but double quotes used for CLI commands and console logs (e.g., `"Usage: node generate-sbom.mjs..."`).
- **Semicolons:** Required at the end of statements.
- **Trailing Commas:** Used in multi-line objects and arrays.

**Linting:**
- Not detected (no `.eslintrc` or `biome.json`).

## Import Organization

**Order:**
1. Built-in Node.js modules (`import { ... } from "fs"`, `import fs from 'node:fs'`).
2. (No third-party or local modules imported currently).

**Path Aliases:**
- Not used.

## Error Handling

**Patterns:**
- `process.exit(1)` for terminal errors in CLI entry points.
- `try-catch` blocks for asynchronous or risky operations (e.g., `runValidator`).
- `throw new Error("...")` for internal logic failures that should be caught or cause a crash.

## Logging

**Framework:** `console.log`, `console.error`, `console.warn`.

**Patterns:**
- `console.log` for informational progress and success messages.
- `console.error` for fatal errors.
- `console.warn` for non-fatal warnings or recommendations.
- Use of ANSI escape codes for coloring terminal output (e.g., `\x1b[31m` for red).

## Comments

**When to Comment:**
- Header comments explain script purpose and compliance specifications (e.g., BSI TR-03183-2).
- Section headers use stylized separators (e.g., `// ── Config ────────────────────────────────────────────────────────────────────`).
- Inline comments describe complex logic or heuristic-based classification.

**JSDoc/TSDoc:**
- Used for file headers and function documentation in `generate-sbom.mjs`.

## Function Design

**Size:**
- Functions are generally small and focused (e.g., `run`, `capture`), though logic-heavy functions like `enrichComponent` can be larger (around 100 lines).

**Parameters:**
- Direct parameters (e.g., `comp`, `cmd`, `sbomPath`).
- Options objects for configuration (e.g., `opts = {}` in `run`).

**Return Values:**
- Mixed: side effects (mutating objects in-place) and returning derived values (e.g., `classifyComponent`).

## Module Design

**Exports:**
- Scripts are designed to be executed directly via Node.js (`#!/usr/bin/env node`).
- No named or default exports are currently used for code reuse between files.

**Barrel Files:**
- Not used.

---

*Convention analysis: 2025-04-20*
