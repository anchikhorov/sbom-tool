# generate-sbom

A Node.js script for generating SBOMs in **CycloneDX 1.6** format, compliant with **BSI TR-03183-2 v2.1.0** (Section 5) requirements.

Tool: [`@cyclonedx/cdxgen`](https://github.com/CycloneDX/cdxgen) — installed automatically.

---

## CycloneDX 1.6 Validation

The generated SBOM passes strict validation:

```bash
cyclonedx-cli validate --input-file ./output.json --input-format json --input-version v1_6 --fail-on-errors
# Validating JSON BOM...
# BOM validated successfully.
```

### CycloneDX 1.6 Schema Fixes

The script automatically fixes incompatibilities between cdxgen output and the strict CycloneDX 1.6 schema:

| Issue | Fix |
|-------|-----|
| `metadata.tools` — incompatible oneOf format | Removed |
| `metadata.lifecycles` — strict validation | Removed |
| `annotations` — requires organization/individual/service | Removed |
| `metadata.manufacturer` — array instead of object | Converted to object |
| `manufacturer.url` — string instead of array | Converted to array |
| `compositions` — uses `ref` instead of `assemblies` | Fixed to `assemblies` |
| `evidence.identity` — array instead of object | Converted to object (first element) |
| `hash.content` — invalid format (NOASSERTION) | Invalid hashes removed |
| `externalReferences[distribution]` — missing URL | URL added based on purl |

---

## Requirements

- Node.js 18+
- npm (for cdxgen installation)
- (optional) `cyclonedx-cli` for validation

---

## Usage

```bash
node generate-sbom.mjs <project-path> [output.json]
```

```bash
# Basic usage
node generate-sbom.mjs ~/projects/my-app

# With explicit output filename
node generate-sbom.mjs ~/projects/my-app ./sbom/my-app-bom.json

# With SBOM creator specified (§5.2.1 — required field)
SBOM_CREATOR_EMAIL=dev@company.com node generate-sbom.mjs ~/projects/my-app
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SBOM_CREATOR_EMAIL` | `""` | SBOM creator email (preferred per BSI §5.2.1) |
| `SBOM_CREATOR_URL` | `https://example.com` | URL fallback if email unavailable |

---

## What the Script Does

### Step 1 — Project Isolation
Copies project to `/tmp/<name>-sbom-isolated`, excluding `node_modules`, `.git`, `build`, `dist`, `coverage`.

### Step 2 — Install cdxgen
Checks for `cdxgen` in `~/.local/bin` or `PATH`. If not found — installs via `npm install -g @cyclonedx/cdxgen`.

### Step 3 — Generate Raw SBOM
Runs `cdxgen` with flags `--spec-version 1.6 --validate`.
cdxgen automatically detects ecosystem from `package.json`, `pom.xml`, `requirements.txt`, etc.

### Step 4 — Enrich for BSI TR-03183-2 §5
Post-processing adds and normalizes fields according to regulatory requirements.

---

## BSI TR-03183-2 Section 5 Field Coverage

### Required Fields for SBOM (§5.2.1)

| BSI Field | CycloneDX Field |
|-----------|-----------------|
| Creator of the SBOM | `metadata.manufacturer[].contact.email` or `.url` |
| Timestamp | `metadata.timestamp` (UTC, ISO 8601) |

### Required Fields for Components (§5.2.2)

| BSI Field | CycloneDX Field |
|-----------|-----------------|
| Component creator | `components[].manufacturer[].url` or `.contact.email` |
| Component name | `components[].name` |
| Component version | `components[].version` |
| Filename of the component | `components[].properties[bsi:component:filename]` |
| Dependencies on other components | `dependencies[]` + `compositions[].aggregate` |
| Distribution licences | `components[].licenses[acknowledgement=concluded]` |
| Hash value (SHA-512, deployable) | `components[].externalReferences[distribution].hashes[SHA-512]` |
| Executable property | `components[].properties[bsi:component:executable]` |
| Archive property | `components[].properties[bsi:component:archive]` |
| Structured property | `components[].properties[bsi:component:structured]` |

### Additional Fields (§5.2.3 / §5.2.4)

| BSI Field | CycloneDX Field |
|-----------|-----------------|
| SBOM-URI | `serialNumber` (urn:uuid:...) |
| Source code URI | `externalReferences[source-distribution].url` |
| URI of deployable component | `externalReferences[distribution].url` |
| Other unique identifiers | `purl`, `cpe`, `swid` |
| Original licences | `licenses[acknowledgement=declared]` |

### Optional Fields (§5.2.5)

| BSI Field | CycloneDX Field |
|-----------|-----------------|
| URL security.txt | `externalReferences[rfc-9116].url` |

---

## Output

```
/tmp/<project-name>-sbom-isolated/  ← isolated copy
<output>.json                       ← final SBOM (default: next to invocation)
```

---

## Manual Review Required After Generation

1. **Missing SHA-512 hashes** — cdxgen doesn't always have access to build artifacts.
   Add real SHA-512 values from CI pipeline (after `npm pack` / `mvn package`).

   > Note: Hashes with invalid format (e.g., `NOASSERTION`) are automatically removed to comply with CycloneDX 1.6 schema.

2. **`compositions.aggregate = "incomplete"`** — conservative default value.
   After verifying dependency graph completeness — change to `"complete"`.

3. **`SBOM_CREATOR_EMAIL`** — required field per BSI §5.2.1.
   Without it, a URL placeholder is used.

4. **`manufacturer.name = "NOASSERTION"`** — for components without known homepage.
   Replace with real URL or author email.

---

## ES Module

The script uses `import` and top-level `await`.
Save as `.mjs` or add `"type": "module"` to `package.json`.

---

## Installing cyclonedx-cli (for validation)

```bash
# macOS
brew install cyclonedx/cyclonedx/cyclonedx-cli

# Linux (download binary)
curl -L https://github.com/CycloneDX/cyclonedx-cli/releases/latest/download/cyclonedx-linux-x64 -o cyclonedx-cli
chmod +x cyclonedx-cli
sudo mv cyclonedx-cli /usr/local/bin/

# Or via .NET
dotnet tool install --global CycloneDX.CLI
```
