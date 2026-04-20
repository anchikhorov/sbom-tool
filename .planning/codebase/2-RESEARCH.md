# Phase 2: Master Orchestrator & Advanced Enrichment - Research

**Researched:** 2024-05-24
**Domain:** SBOM Enrichment, NPM Registry, Git Metadata, Environment Management
**Confidence:** HIGH

## Summary

This research establishes the technical foundation for the "Ideal Script Algorithm" in Phase 2. We have verified the structure of the NPM Registry API for authoritative metadata fetching, analyzed the BSI Property Taxonomy for dynamic parsing, and identified robust patterns for environment pre-flight checks and Git metadata extraction. The primary recommendation is to use a tiered enrichment strategy that prioritizes remote authoritative sources (NPM Registry) while maintaining reliable fallbacks for offline or private components.

**Primary recommendation:** Use the standard Node.js `fetch` API for all remote requests and implement a regex-based parser for the BSI Markdown table to avoid heavy Markdown dependencies.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Advanced Enrichment Loop:**
  - **Tier 1 (NPM Registry):** Fetch `dist.integrity` (SHA-512) and official license metadata from `https://registry.npmjs.org/[name]/[version]`.
  - **Tier 2 (Local Disk):** Fallback to `node_modules/[package]/package.json`.
  - **Tier 3 (Git/Source):** Metadata extraction from project-linked Git repositories.
  - **Tier 4 (Calculated Fallback):** Local SHA-512 calculation with property `bsi:hash-source: calculated`.
- **Dynamic BSI Taxonomy Validation:**
  - **Source:** `https://raw.githubusercontent.com/BSI-Bund/tr-03183-cyclonedx-property-taxonomy/main/README.md`.
  - **Logic:** Implement a parser for `bsi:*` properties from Markdown tables.
  - **Offline Fallback:** Maintain cached version within the package.
- **Orchestrator Orchestration (Setup & Pre-flight):**
  - **Tool Management:** Automatic check and local installation of `cdxgen` if not found in PATH.
  - **Environment Isolation:** Handle diverse project types (NPM, Maven, Python).
- **Patching & Polish:**
  - **License Handling:** Assign `LicenseRef-ROWE-Unknown` as last resort.
  - **Schema Integrity:** Strict CycloneDX 1.6 validation.

### the agent's Discretion
- Choice of parser for Markdown tables (regex vs library).
- Method for verifying command availability (e.g., `command-exists` vs shell probing).
- Specific implementation of the "Ideal Script Algorithm" state machine.

### Deferred Ideas (OUT OF SCOPE)
- N/A
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `hosted-git-info` | 9.0.2 | Parse Git URIs | Authoritative for GitHub, GitLab, Bitbucket URL variations. |
| `axios` | 1.6.x | HTTP Client | Reliable for API requests with retry/timeout support. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `which` | 3.0.x | Command lookup | Cross-platform command location (replaces manual `where/which`). |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `axios` | Built-in `fetch` | No extra dependency, but `axios` has better timeout/retry defaults. |
| `which` | `child_process.execSync('which...')` | Simple, but `which` library handles Windows/Mac/Linux more reliably. |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── core/
│   ├── enrichment/
│   │   ├── npm-provider.js    # Tier 1
│   │   ├── local-provider.js  # Tier 2
│   │   └── git-provider.js    # Tier 3
│   └── taxonomy/
│       └── bsi-parser.js      # BSI Markdown Parser
├── utils/
│   ├── preflight.js           # Tool & Environment checks
│   └── hash.js                # Local SHA-512 calculation (Tier 4)
└── orchestrator.js            # Main loop & logic
```

### Pattern 1: Enrichment Loop (Tiered)
**What:** Sequentially attempt to fetch metadata from higher-priority providers.
**When to use:** During component processing for the SBOM.

### Pattern 2: Dynamic Taxonomy Parser
**What:** Fetch README.md from GitHub, extract table rows using regex, and build a map of allowed properties.
**Implementation:**
```javascript
const tableRegex = /\|\s*\*\*`(bsi:[a-z:]+)`\*\*\s*\|\s*(.*?)\s*\|/g;
// Extract property and description from BSI taxonomy README
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git URI Parsing | Custom Regex | `hosted-git-info` | Handles `git+https`, `github:`, `git+ssh`, and shorthand (user/repo). |
| Cross-platform `which` | `platform === 'win32'` logic | `which` npm package | Handles `PATHEXT` on Windows and other edge cases. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `cdxgen` | SBOM Generation | ✓ | 11.11.0 | Install via `npm install -g @cyclonedx/cdxgen` |
| `npm` | Pre-flight installation | ✓ | 10.x | Error if missing |

## Common Pitfalls

### Pitfall 1: NPM Registry Rate Limiting
**What goes wrong:** Fast loops over many dependencies trigger 429 errors.
**How to avoid:** Implement a small delay or use a library like `p-queue` to limit concurrency to 3-5 requests.

### Pitfall 2: BSI Markdown Changes
**What goes wrong:** Small formatting changes in the Markdown (e.g., extra spaces) break regex.
**How to avoid:** Use a robust regex that handles optional whitespace and optional backticks.

## Code Examples

### NPM Registry Fetching
```javascript
// [VERIFIED: registry.npmjs.org]
async function fetchNpmMetadata(name, version) {
  const url = `https://registry.npmjs.org/${name}/${version}`;
  const response = await fetch(url);
  const data = await response.json();
  return {
    integrity: data.dist?.integrity,
    license: typeof data.license === 'string' ? data.license : data.license?.type
  };
}
```

### BSI Taxonomy Parsing
```javascript
// [VERIFIED: raw.githubusercontent.com]
function parseBsiTaxonomy(markdown) {
  const properties = [];
  const matches = markdown.matchAll(/\|\s*\*\*`(bsi:component:[a-z:]+)`\*\*\s*\|/gi);
  for (const match of matches) {
    properties.push(match[1]);
  }
  return properties;
}
```

### Git URI Extraction
```javascript
// [VERIFIED: hosted-git-info docs]
import hostedGitInfo from 'hosted-git-info';

function getGitSource(dependencyUri) {
  const info = hostedGitInfo.fromUrl(dependencyUri);
  return info ? info.browse() : null; // returns https://github.com/user/repo
}
```

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Validate BSI property names before injection into SBOM. |
| V10 Malicious Code | yes | Verify `dist.integrity` (SHA-512) matches local package. |

## Sources

### Primary (HIGH confidence)
- `registry.npmjs.org` - Verified structure for `lodash@4.17.21`.
- `BSI-Bund/tr-03183-cyclonedx-property-taxonomy` - Verified README structure via direct fetch.
- `hosted-git-info` - NPM registry and documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries are mature and industry standard.
- Architecture: HIGH - Tiered loop and dynamic parsing are robust patterns.
- Pitfalls: MEDIUM - Rate limiting is a known issue but specific limits vary.

**Research date:** 2024-05-24
**Valid until:** 2024-06-24
