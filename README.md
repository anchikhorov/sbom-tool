# SBOM Tool (BSI TR-03183-2)

An enterprise-grade CLI tool for generating, enriching, and validating Software Bill of Materials (SBOM) according to the **BSI TR-03183-2** technical taxonomy and **CycloneDX 1.6** standards.

## ⚠️ Disclaimer

```text
******************************************************************
!!! ATTENTION: TECHNICAL TAXONOMY VALIDATION ONLY!!!
This tool ONLY checks the JSON structure and field format
for compliance with BSI TR-03183-2 requirements.
1. This is NOT a security audit or compliance certification.
2. The tool does NOT verify the accuracy or completeness of the data.
3. A successful validation does NOT guarantee legal compliance.
4. Provided "AS IS" without any obligations or warranty of any kind.
****************************************************************
```

## Features

- **High-Performance Generation**: Generates CycloneDX 1.6 SBOMs using `cdxgen`.
- **BSI Attribute Mapping**: Automatically enriches components with BSI-required properties (taxonomy, filenames, executable/archive classification, etc.).
- **Smart Enrichment**:
  - Prioritizes local `node_modules` and lockfile data to minimize network requests.
  - Falls back to NPM Registry for missing metadata with built-in retry and timeout safety.
  - Handles complex license expressions (e.g., `MIT OR Apache-2.0`) correctly for BSI validation.
- **Strict Structural Validation**: Validates output against both the CycloneDX 1.6 JSON Schema and specific BSI TR-03183-2 structural taxonomy rules. *Note: To satisfy structural graph requirements, the tool strictly registers all parsed components into the dependencies array, but true functional completeness of the dependency tree relies entirely on the upstream generator utilizing accurate lockfiles (like package-lock.json).*
- **Isolated Execution**: Performs manifest-only analysis in temporary workspaces to avoid side effects.

## Installation

### Prerequisites
- Node.js (v20+)
- npm

### Setup
```bash
# Install dependencies
npm install

# Link for global CLI use
npm link
```

## Usage

### Generate an SBOM
Generates and enriches an SBOM for a project directory.
```bash
sbom-tool generate <path-to-project> [--output <file-path>]
```

### Validate an SBOM
Performs technical taxonomy validation on an existing SBOM file.
```bash
sbom-tool validate <path-to-sbom.json>
```

### Audit an SBOM
Audits an SBOM for BSI compliance gaps and generates detailed reports.
```bash
sbom-tool audit <path-to-sbom.json> [--output-dir <directory>] [--format <markdown|json|both>]
```

## Configuration

The tool automatically looks for an `sbom.config.json` in the current working directory. You can configure the following options:

```json
{
  "useCyclonedxNpm": false,
  "creatorEmail": "[EMAIL_ADDRESS]",
  "creatorUrl": "https://www.example.com",
  "exclude": ["node_modules", ".git", "build", "dist", "coverage", ".cache"],
  "privatePackages": ["package-name"],
  "cdxgenVersion": "11",
  "specVersion": "1.6"
}
```

### Configuration Options
- `useCyclonedxNpm` (boolean): Set to `true` to use `@cyclonedx/cyclonedx-npm` instead of `cdxgen` for generating the initial SBOM.
- `creatorEmail` (string): Email for the SBOM manufacturer (can be overridden by `SBOM_CREATOR_EMAIL` env var or Git config).
- `creatorUrl` (string): URL for the SBOM manufacturer (can be overridden by `SBOM_CREATOR_URL` env var or Git remote origin).
- `exclude` (array): Directories to exclude during generation (used primarily by `cdxgen`).
- `privatePackages` (array): List of prefixes for internal packages. Packages matching these prefixes will use the `creatorUrl` instead of public npm registry URLs.
- `cdxgenVersion` (string): Target `cdxgen` major version (default: `"11"`, override with `CDXGEN_VERSION`).
- `specVersion` (string): Target CycloneDX spec version (default: `"1.6"`, override with `SBOM_SPEC_VERSION`).

## Technical Details

### Enrichment Tiers
1. **Existing Data**: Uses data already present in the raw SBOM (extracted from lockfiles).
2. **Local Provider**: Reads `package.json` from `node_modules`.
3. **Registry Provider**: Fetches authoritative metadata from the NPM Registry (only if needed).
4. **Calculated**: Generates SHA-512 hashes for local components.

### Performance
For large projects (2,000+ components), the tool uses parallel batch processing to ensure fast execution while respecting registry rate limits.

## License

MIT License. See [LICENSE](LICENSE) for details.

Provided "AS IS" for technical taxonomy validation purposes.
