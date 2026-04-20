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
4. Provided "AS IS" without any obligations.
****************************************************************
```

## Features

- **High-Performance Generation**: Generates CycloneDX 1.6 SBOMs using `cdxgen`.
- **BSI Attribute Mapping**: Automatically enriches components with BSI-required properties (taxonomy, filenames, executable/archive classification, etc.).
- **Smart Enrichment**:
  - Prioritizes local `node_modules` and lockfile data to minimize network requests.
  - Falls back to NPM Registry for missing metadata with built-in retry and timeout safety.
  - Handles complex license expressions (e.g., `MIT OR Apache-2.0`) correctly for BSI validation.
- **Strict Validation**: Validates output against both the CycloneDX 1.6 JSON Schema and specific BSI TR-03183-2 structural rules.
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

The tool automatically looks for an `sbom.config.json` in the current working directory. You can also use environment variables for CI/CD flexibility:
- `SBOM_CREATOR_EMAIL`: Default email for the SBOM manufacturer.
- `SBOM_CREATOR_URL`: Default URL for the SBOM manufacturer.

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
