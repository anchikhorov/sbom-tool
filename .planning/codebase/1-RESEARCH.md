# Phase 1: Project Formalization & CLI Refactoring - Research

**Researched:** February 2025
**Domain:** Node.js ESM Package Structure, CLI Development, SBOM Generation, Testing
**Confidence:** HIGH

## Summary

This research confirms the optimal patterns for formalizing the SBOM tool into a professional Node.js package. The transition to ESM (ECMAScript Modules) is standard for modern Node.js development and simplifies integration with tools like Vitest. Key findings highlight the necessity of Java 21+ for `cdxgen`'s advanced features and the use of Import Attributes for clean JSON schema bundling.

**Primary recommendation:** Use `commander.js` subcommands in a single-entry CLI and `memfs` for reliable file system mocking during tests.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@cyclonedx/cdxgen` | 12.2.0 | SBOM Generation | Industry standard for CycloneDX generation. [VERIFIED: npm registry] |
| `commander` | 14.0.3 | CLI Framework | Most robust and feature-rich CLI parser for Node.js. [VERIFIED: npm registry] |
| `ajv` | 8.18.0 | JSON Schema Validation | Fastest and most standard-compliant JSON validator. [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | 4.1.4 | Test Runner | Faster and more ESM-native alternative to Jest. [VERIFIED: npm registry] |
| `memfs` | 4.57.2 | Mock File System | For testing fs operations without touching disk. [VERIFIED: npm registry] |
| `ajv-formats` | 3.0.1 | Schema Formats | Adds support for date-time, email, etc. in schemas. [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `commander` | `yargs` | Yargs is more declarative but often heavier; commander is more idiomatic for modern CLIs. [ASSUMED] |
| `vitest` | `node:test` | `node:test` is built-in but lacks the rich mocking and ecosystem of Vitest. [ASSUMED] |

**Installation:**
```bash
npm install commander @cyclonedx/cdxgen ajv ajv-formats
npm install -D vitest memfs
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── commands/        # CLI Command handlers (generate, validate)
├── core/            # Business logic (enrichment, classification)
├── utils/           # Shared helpers
└── schemas/         # Bundled JSON schemas
bin/
└── sbom-tool.mjs    # CLI entry point
```

### Pattern 1: Bundling JSON Schemas in ESM
**What:** Use Import Attributes to load JSON schemas natively.
**When to use:** Node.js 18.20+, 20.10+, or 22+.
**Example:**
```javascript
// Source: Official Node.js Documentation
import schema from "../schemas/bom-1.6.schema.json" with { type: "json" };

export { schema };
```

### Pattern 2: Commander.js Subcommands
**What:** Use the action handler pattern for modular subcommands.
**When to use:** Unified CLI with distinct operations (`generate`, `validate`).
**Example:**
```javascript
import { Command } from 'commander';
const program = new Command();

program
  .command('generate <path>')
  .description('Generate BSI-compliant SBOM')
  .option('-o, --output <file>', 'Output destination')
  .action(async (path, options) => {
    // Logic here
  });

program.parse();
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Validation | Custom Regex/Checks | `ajv` | Handles complex references and performance. [CITED: ajv.js.org] |
| Dependency Resolution | Native code analysis | `cdxgen` | Extremely complex domain with many edge cases (lockfiles, manifest types). [CITED: cyclonedx/cdxgen] |

## Common Pitfalls

### Pitfall 1: cdxgen Java Version
**What goes wrong:** `cdxgen` freezes or fails to analyze certain project types (C, Python).
**Why it happens:** Requires **Java >= 21** for advanced analysis features. [VERIFIED: cdxgen docs]
**How to avoid:** Check Java version in the `generate` command before execution or document requirement.

### Pitfall 2: ESM Mocking Hoisting
**What goes wrong:** `vi.mock()` fails because variables it uses aren't available yet.
**Why it happens:** `vi.mock` is hoisted to the top of the file in Vitest.
**How to avoid:** Use `vi.hoisted()` for variables needed in the mock factory. [CITED: vitest.dev]

## Code Examples

### Mocking `child_process` in Vitest (ESM)
```javascript
// Source: Vitest Official Docs / Community Best Practices
import { vi } from 'vitest';
import { exec } from 'node:child_process';

vi.mock('node:child_process', () => ({
  exec: vi.fn((cmd, cb) => {
    // Return mock success
    cb(null, '{ "bomFormat": "CycloneDX" }', '');
  }),
}));
```

### Mocking `fs` with `memfs`
```javascript
import { vi } from 'vitest';
import { fs, vol } from 'memfs';

vi.mock('node:fs', () => ({ default: fs, ...fs }));

// In test
vol.fromJSON({ './test-dir': {} });
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Core Runtime | ✓ | 22.12.0 | — |
| Java | cdxgen (advanced) | ✗ | — | Skip deep analysis |
| npm | Dependency fetch | ✓ | 10.9.0 | — |

**Missing dependencies with no fallback:**
- None for basic execution.

**Missing dependencies with fallback:**
- **Java >= 21:** Required for `cdxgen` "deep" analysis (C/C++/Python/Rust). Fallback: Basic manifest parsing (npm/yarn/maven) usually works without Java if lockfiles are present.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.mjs` |
| Quick run command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLI-01 | Support `generate` cmd | Integration | `npx vitest tests/cli.test.mjs` | ❌ Wave 0 |
| VAL-01 | Schema validation | Unit | `npx vitest tests/validate.test.mjs` | ❌ Wave 0 |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | `ajv` for JSON schemas |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Command Injection | Tampering | Sanitize paths before passing to `exec` |

## Sources

### Primary (HIGH confidence)
- `commander` npm docs - CLI patterns
- `cyclonedx/cdxgen` GitHub README - Environment requirements
- `vitest.dev` - Mocking ESM modules

### Secondary (MEDIUM confidence)
- Community posts on `memfs` integration with Vitest ESM.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Current registry versions.
- Architecture: HIGH - Standard Node.js patterns.
- Pitfalls: HIGH - Documented cdxgen/vitest behaviors.

**Research date:** February 2025
**Valid until:** March 2025
