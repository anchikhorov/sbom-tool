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
*Default output: `<project-name>-bom.json` in the parent directory of the tool.*

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
*Default output: `audit-reports/` directory in the parent directory of the tool.*

## Configuration

The tool automatically looks for an `sbom.config.json` in the current working directory. You can configure the following options:

```json
{
  "useCyclonedxNpm": false,
  "creatorEmail": "user@example.com",
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

### Generation Pipeline
The tool runs a 5-step pipeline when generating an SBOM:
1. **Pre-flight**: Checks for the selected generator (`cdxgen` or `cyclonedx-npm`) and auto-installs it if missing.
2. **Isolation**: Copies only manifest files (`package.json`, `package-lock.json`) to a temporary workspace to avoid side effects.
3. **Generation**: Runs the selected generator against the isolated workspace.
4. **Enrichment**: Applies BSI TR-03183-2 attribute mapping (see tiers below).
4b. **Completeness Check**: Automatically verifies that every package from `npm ls` exists in the SBOM (see below).
5. **Validation**: Double validates the output against the CycloneDX 1.6 JSON Schema and BSI structural rules.

### Enrichment Tiers
1. **Existing Data**: Uses data already present in the raw SBOM (extracted from lockfiles).
2. **Local Provider**: Reads `package.json` from `node_modules`.
3. **Registry Provider**: Fetches authoritative metadata from the NPM Registry (only if needed).
4. **Calculated Hashes (BSI §5.2.2 compliant)**: If SHA-512 is missing, the tool downloads the actual deployable tarball (`.tgz`) from the NPM registry and calculates the hash on-the-fly. BSI §5.2.2 requires the hash of the *"deployed/deployable component (i.e. as a file on a mass storage device)"* — so we hash the tarball itself, not a local `package.json`. If the NPM tarball is unavailable, it falls back to GitHub release tarballs. Calculated hashes are marked with the `bsi:hash-source: calculated` property.

### Completeness Verification
BSI TR-03183-2 requires a `compositions` block declaring whether the dependency list is `"complete"` or `"incomplete"`. Instead of blindly defaulting to `"incomplete"`, the tool performs an automated **set-containment check**:

1. Runs `npm ls --all --parseable --package-lock-only` against the project to get every package the lockfile knows about.
2. Extracts unique package names (deduplicating hoisted paths).
3. Builds a set of all component names present in the generated SBOM.
4. Checks that **every** lockfile package exists in the SBOM.

- **`"complete"`** = 0 missing packages (100% of lockfile packages found in the SBOM).
- **`"incomplete"`** = 1 or more lockfile packages are missing — the tool lists them by name.
- The SBOM is allowed to contain *more* components than the lockfile (e.g., bundled dependencies, platform-specific optional deps resolved by the generator).
- Production dependencies (`--omit=dev`) are checked first, since most generators exclude devDependencies by default.

### Private Packages
For internal packages that are not published on public registries (e.g., your own application), the tool substitutes public NPM URLs with the configured `creatorUrl`. Configure this via the `privatePackages` array in `sbom.config.json`. Any component whose name starts with a listed prefix will receive the `creatorUrl` for its distribution and manufacturer URLs instead of `registry.npmjs.org`.

### Performance
For large projects (2,000+ components), the tool uses parallel batch processing to ensure fast execution while respecting registry rate limits.

### BSI Compliance Notes

#### Hash Calculation (§5.2.2)

BSI TR-03183-2 §5.2.2 requires a *"cryptographically secure checksum (hash value) of the deployed/deployable component (i.e. as a file on a mass storage device) as SHA-512"*.

For NPM packages, the **deployable component** is the `.tgz` tarball — the exact file that gets downloaded and installed via `npm install`. This tool's hash calculation is fully compliant with this requirement:

1. **Registry SRI (preferred)**: When the NPM registry provides an `integrity` field (Subresource Integrity), it contains the SHA-512 hash of the tarball. This is the canonical, authoritative hash.
2. **Calculated from tarball (fallback)**: When the registry does not provide an SRI hash (e.g., for legacy packages), the tool downloads the actual `.tgz` tarball from the NPM registry and calculates the SHA-512 hash on-the-fly. This produces the **exact same hash** as the SRI field — both are hashes of the same deployable artifact.
3. **GitHub release tarball (secondary fallback)**: If the NPM tarball is unavailable, the tool tries the GitHub release tarball.

> **Important**: The tool intentionally does NOT hash local files from `node_modules/` (e.g., a `package.json`), because a single file inside an extracted package is not the "deployable component" as defined by BSI. Only the tarball itself qualifies.

Note that the **source code hash** is a separate *optional* field defined in BSI §5.2.5 and is not the same as the deployable hash.

## License

MIT License. See [LICENSE](LICENSE) for details.

Provided "AS IS" for technical taxonomy validation purposes.
