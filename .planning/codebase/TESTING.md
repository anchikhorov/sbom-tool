# Testing Patterns

**Analysis Date:** 2025-04-20

## Test Framework

**Runner:**
- Not detected. No automated test runner (e.g., Jest, Vitest, Mocha) is used.

**Assertion Library:**
- Not detected.

**Run Commands:**
```bash
# Manual execution for verification
node generate-sbom.mjs <path-to-project> [output-file.json]
node validate-sbom.mjs [sbom-file.json]
```

## Test File Organization

**Location:**
- No dedicated test files or directories detected (e.g., no `tests/` or `__tests__/`).

**Naming:**
- Not applicable.

**Structure:**
- Not applicable.

## Test Structure

**Suite Organization:**
- No automated test suites exist.

**Patterns:**
- No automated patterns observed.

## Mocking

**Framework:** None.

**Patterns:**
- No automated mocking observed.

**What to Mock:**
- Not applicable.

**What NOT to Mock:**
- Not applicable.

## Fixtures and Factories

**Test Data:**
- Several sample SBOM files exist in the root directory for manual testing:
  - `rowe-cp-bom.json`
  - `rowe-ui-bom.json`
  - `ScanInterface-bom.json`

**Location:**
- Root directory: `/`

## Coverage

**Requirements:** None enforced.

**View Coverage:**
- Not applicable.

## Test Types

**Unit Tests:**
- Not present.

**Integration Tests:**
- Manual end-to-end (E2E) testing by running the generation and validation scripts.

**E2E Tests:**
- Not automated.

## Common Patterns

**Async Testing:**
- Not applicable.

**Error Testing:**
- Manual verification of error paths (e.g., passing invalid project paths to `generate-sbom.mjs`).

---

*Testing analysis: 2025-04-20*
