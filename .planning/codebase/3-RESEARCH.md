# Phase 3: Audit & Verification Workflow - Research

**Researched:** 2024-10-24
**Domain:** SBOM Auditing, Compliance Reporting, Node.js Rules Engine
**Confidence:** HIGH

## Summary

This phase focuses on implementing the `audit` command to facilitate manual review of SBOMs as required by BSI TR-03183-2 §5.1. The research confirms that a lightweight, modular rules engine is the most effective approach for a CLI-based tool, avoiding heavy dependencies like OPA/Rego while maintaining flexibility.

**Primary recommendation:** Use a functional rules engine pattern where each rule is an independent module. Generate reports using native ES6 template literals for maximum performance and zero dependencies.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `commander.js` | ^12.1.0 | CLI Command handling | Existing project standard for command-line interfaces. |
| `ajv` | ^8.17.1 | Schema validation | Existing project standard for CycloneDX JSON validation. |
| `node:fs` | native | File I/O | Native Node.js modules are preferred for CLI performance and portability. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jsonpath` | ^1.1.1 | Traversing SBOM | Useful for complex rules that need to find nodes deep in the hierarchy (e.g., nested dependencies). |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom JS Rules | OPA/Rego | OPA is powerful but adds significant complexity and a non-JS dependency (binary or WASM). |
| Template Literals | Handlebars | Handlebars is better for complex nested partials but adds an external dependency and runtime overhead. |

## Architecture Patterns

### Audit Rules Engine Pattern
A modular rules engine allows for easy extension. Each rule should follow a standard interface:

```typescript
interface AuditRule {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  remediation: string;
  test: (sbom: object) => AuditFinding[];
}

interface AuditFinding {
  ruleId: string;
  severity: string;
  message: string;
  location: string; // Breadcrumb or JSONPath
  remediation: string;
}
```

### Recommended Project Structure
```
src/
├── commands/
│   └── audit.js          # CLI action and orchestration
├── core/
│   ├── audit/
│   │   ├── engine.js     # Rules runner
│   │   └── rules/        # Individual rule modules
│   │       ├── completeness.js
│   │       ├── integrity.js
│   │       └── compliance.js
│   └── validation.js     # Existing validation logic
└── utils/
    └── reports.js        # Markdown/JSON report templates
```

### Report Generation Pattern
Using template literals allows for readable, logic-aware Markdown generation:

```javascript
// src/utils/reports.js
export function generateMarkdownReport(findings, metadata) {
  return `
# SBOM Audit Report
**Date:** ${new Date().toISOString()}
**Target:** ${metadata.name}

## Summary
- **Errors:** ${findings.filter(f => f.severity === 'error').length}
- **Warnings:** ${findings.filter(f => f.severity === 'warning').length}

## Findings
| Severity | Rule | Message | Location |
|----------|------|---------|----------|
${findings.map(f => `| ${f.severity} | ${f.ruleId} | ${f.message} | ${f.location} |`).join('\n')}

## Action Items
${findings.map(f => `### ${f.ruleId}\n**Remediation:** ${f.remediation}`).join('\n\n')}
`;
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Parsing | Custom regex | `JSON.parse` | Performance and security. |
| Path Traversal | Manual recursion | `jsonpath` (optional) | Handles edge cases in nested arrays/objects reliably. |
| Directory Creation | Manual `exists` checks | `fs.mkdirSync(path, { recursive: true })` | Atomic and handles nested parents. |

## Common Pitfalls

### Pitfall 1: Brittle Location Mapping
**What goes wrong:** Reporting the location as a raw index (e.g., `components[4]`) which changes when the SBOM is updated.
**How to avoid:** Use stable identifiers in the location string, such as `Component: [name]@[version] (PURL: [purl])`.

### Pitfall 2: Silent Failures in Output Directory
**What goes wrong:** CLI crashes if the output directory doesn't exist or is not writable.
**How to avoid:** Perform a pre-flight check on the output directory using `fs.access` or use `try-catch` around `mkdirSync`.

### Pitfall 3: Re-validating Schema Unnecessarily
**What goes wrong:** The audit command runs the full AJV schema validation even if the file is already known to be invalid from a previous step.
**How to avoid:** Separate "Structural Validation" from "Compliance Audit". Structural errors should be reported as a separate "Phase 0" of the audit.

## Code Examples

### Rules Engine Runner (Core Logic)
```javascript
// src/core/audit/engine.js
import { rules } from './rules/index.js';

export async function runAudit(sbom) {
  const allFindings = [];
  
  for (const rule of rules) {
    try {
      const findings = await rule.test(sbom);
      allFindings.push(...findings);
    } catch (err) {
      console.error(`Rule ${rule.id} failed:`, err);
    }
  }
  
  return allFindings;
}
```

### CLI Output Management (`commander.js`)
```javascript
// src/commands/audit.js
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export async function auditAction(inputPath, options) {
  const outputDir = resolve(options.outputDir || './audit-reports/');
  mkdirSync(outputDir, { recursive: true });
  
  // ... run audit ...
  
  if (options.format === 'markdown' || options.format === 'both') {
    writeFileSync(resolve(outputDir, 'audit-report.md'), markdownContent);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual Spreadsheet Audit | Automated Rules Engine | 2023+ (SBOM boom) | Faster compliance cycles, less human error. |
| Vulnerability Scanning only | Compliance + Integrity Auditing | BSI TR-03183-2 (2024) | Shifts focus from "is it secure" to "is it accurately documented". |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `jsonpath` is allowed as a dependency. | Standard Stack | If not, manual traversal logic is required (medium effort). |
| A2 | Template literals are sufficient for BSI report requirements. | Report Generation | If BSI requires a specific XML/PDF format, we need specialized exporters. |

## Open Questions

1. **Rule Overlap:** Should `audit` report the same errors as `validate`?
   - *Recommendation:* Yes, but categorized differently. `validate` ensures it's a valid SBOM; `audit` ensures it's a *compliant* SBOM.
2. **Interactive Remediation:** Should the CLI offer interactive fixes?
   - *Recommendation:* Out of scope for Phase 3. Keep as read-only reporting.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | 20.x+ | — |
| npm | Dependency management | ✓ | 10.x+ | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vitest.config.mjs` |
| Quick run command | `npm test tests/core/audit.test.js` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDIT-01 | Flag `NOASSERTION` fields | unit | `npm test tests/core/audit/rules.test.js` | ❌ Wave 0 |
| AUDIT-02 | Flag `calculated` hash source | unit | `npm test tests/core/audit/rules.test.js` | ❌ Wave 0 |
| REPORT-01 | Generate JSON report | unit | `npm test tests/core/audit/reports.test.js` | ❌ Wave 0 |
| REPORT-02 | Generate Markdown report | unit | `npm test tests/core/audit/reports.test.js` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `tests/core/audit/engine.test.js` — covers rules orchestration
- [ ] `tests/core/audit/rules.test.js` — covers individual compliance rules
- [ ] `tests/utils/reports.test.js` — covers Markdown/JSON generation

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Validate input JSON against CycloneDX schema before auditing. |
| V12 Files and Resources | yes | Secure path handling for `--output-dir` to prevent path traversal. |

### Known Threat Patterns for Node.js CLI

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path Traversal | Information Disclosure | Use `path.resolve` and validate that output remains within intended scope. |
| Prototype Pollution | Elevation of Privilege | Use `Object.create(null)` for findings collections if keys are dynamic. |

## Sources

### Primary (HIGH confidence)
- BSI TR-03183-2 v2.1.0 - Section 5.1 (Audit requirements)
- `commander.js` documentation - CLI patterns
- CycloneDX 1.6 Schema - Structural requirements

### Secondary (MEDIUM confidence)
- ES6 Template Literals vs Handlebars benchmarks
- OPA/Rego documentation (for alternative comparison)

### Tertiary (LOW confidence)
- Custom JSONPath library vs manual traversal (performance tradeoffs in large SBOMs)
