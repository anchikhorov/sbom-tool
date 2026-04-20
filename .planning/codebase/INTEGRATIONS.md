# External Integrations

**Analysis Date:** 2025-01-24

## APIs & External Services

**License Data:**
- SPDX License List (`raw.githubusercontent.com`) - Used in `validate-sbom.mjs` to source valid license identifiers.
  - SDK/Client: `fetch` (native Node.js).
  - Auth: None (public URL).

**Tools/Packages:**
- npm registry - Used to install `@cyclonedx/cdxgen` and `@cyclonedx/cyclonedx-npm`.
  - SDK/Client: `npm` CLI via `child_process`.

## Data Storage

**Databases:**
- None.

**File Storage:**
- Local filesystem only. Reads input projects and writes JSON SBOM files.
- Uses `/tmp` for project isolation during the generation process.

**Caching:**
- None (tools are checked for existence in `~/.local/bin` and `PATH`).

## Authentication & Identity

**Auth Provider:**
- Custom / None (Identities are provided via environment variables for SBOM metadata).
  - Implementation: `SBOM_CREATOR_EMAIL`, `SBOM_CREATOR_URL`.

## Monitoring & Observability

**Error Tracking:**
- Console output (stderr).

**Logs:**
- Console output (stdout) for progress tracking and validation reports.

## CI/CD & Deployment

**Hosting:**
- Local or CI runner execution.

**CI Pipeline:**
- Implied integration in CI/CD pipelines (e.g., GitHub Actions, GitLab CI) for automatic SBOM generation during build processes.

## Environment Configuration

**Required env vars:**
- `SBOM_CREATOR_EMAIL`: Identifies the SBOM creator in the output file.
- `SBOM_CREATOR_URL`: Fallback identifier if email is not set.

**Secrets location:**
- None (No secrets currently used).

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- None.

---

*Integration audit: 2025-01-24*
