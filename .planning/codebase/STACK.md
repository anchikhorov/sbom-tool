# Technology Stack

**Analysis Date:** 2025-01-24

## Languages

**Primary:**
- JavaScript (ES Modules) - Used for both `generate-sbom.mjs` and `validate-sbom.mjs`. Node.js 18+ is required.

**Secondary:**
- Shell (Bash/cmd) - Used via `child_process` to execute external tools like `cdxgen` and `npm`.

## Runtime

**Environment:**
- Node.js 18+

**Package Manager:**
- npm (internal) - Used within `generate-sbom.mjs` to automatically install required global tools if they are not found.
- Lockfile: missing (the project itself doesn't have a `package.json`).

## Frameworks

**Core:**
- None (Standalone Node.js scripts).

**Testing:**
- `validate-sbom.mjs` - Custom validation script for BSI TR-03183-2 compliance.
- `cyclonedx-cli` (External) - Recommended for CycloneDX 1.6 schema validation.

**Build/Dev:**
- Node.js scripts for automation.

## Key Dependencies

**Critical:**
- `@cyclonedx/cdxgen` - Primary tool for generating raw SBOMs.
- `@cyclonedx/cyclonedx-npm` - Alternative generator for npm-specific projects.

**Infrastructure:**
- `child_process` (Node.js built-in) - Used to run CLI tools.
- `fs`, `path`, `os`, `crypto` (Node.js built-ins) - Used for file manipulation, path resolution, and hash generation.

## Configuration

**Environment:**
- Configured via environment variables for SBOM metadata.
- `SBOM_CREATOR_EMAIL`: Email of the SBOM creator (preferred for BSI §5.2.1).
- `SBOM_CREATOR_URL`: URL fallback for the SBOM creator.

**Build:**
- None (No build step required).

## Platform Requirements

**Development:**
- Node.js 18+
- npm

**Production:**
- Linux/macOS/Windows (Node.js compatible).
- Requires access to `/tmp` for project isolation during generation.

---

*Stack analysis: 2025-01-24*
