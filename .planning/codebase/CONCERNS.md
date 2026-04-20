# Codebase Concerns

**Analysis Date:** 2024-05-22

## Tech Debt

**Hardcoded Configuration:**
- Issue: `SBOM_CREATOR_EMAIL` and `SBOM_CREATOR_URL` have hardcoded defaults in `generate-sbom.mjs`.
- Files: `generate-sbom.mjs`
- Impact: Generated SBOMs may contain incorrect creator information if environment variables are not set.
- Fix approach: Require these values as command-line arguments or environment variables and fail if they are missing.

**Global Tool Installation:**
- Issue: `generate-sbom.mjs` attempts to install `cdxgen` or `cyclonedx-npm` globally via `npm install -g` if not found.
- Files: `generate-sbom.mjs`
- Impact: This can fail in environments with restricted permissions (e.g., CI/CD without sudo) or cause unintended changes to the host system.
- Fix approach: Recommend using `npx` or having the tool pre-installed in the environment instead of attempting global installation.

**Manual SBOM Manipulation:**
- Issue: Extensive manual post-processing of the SBOM JSON in `generate-sbom.mjs` is used to meet BSI TR-03183-2 requirements.
- Files: `generate-sbom.mjs`
- Impact: This logic is fragile and may break with newer versions of `cdxgen` or CycloneDX schema changes.
- Fix approach: Use official CycloneDX libraries for SBOM manipulation and validation where possible.

**Heuristic Classification:**
- Issue: `classifyComponent` and `enrichComponent` use heuristics (e.g., file extensions, PURL prefixes) to determine component properties.
- Files: `generate-sbom.mjs`
- Impact: These heuristics may be inaccurate for certain component types or edge cases.
- Fix approach: Improve heuristics or provide a way for users to override these properties with a configuration file.

**"NOASSERTION" Placeholder Usage:**
- Issue: Many required or recommended fields default to "NOASSERTION" for missing data.
- Files: `generate-sbom.mjs`, `validate-sbom.mjs`
- Impact: While technically allowed in some cases, heavy use of "NOASSERTION" may not satisfy strict compliance requirements or provide useful data.
- Fix approach: Encourage or require more complete data input for critical fields.

## Security Considerations

**Shell Command Execution:**
- Issue: Use of `shell: true` in `spawnSync` and `execSync` when running generator commands.
- Files: `generate-sbom.mjs`
- Impact: Potential risk of command injection if inputs like `projectPath` or `outputFile` are not properly sanitized.
- Fix approach: Use array-based arguments with `spawnSync` and avoid `shell: true` where possible.

**External Runtime Dependencies:**
- Issue: `validate-sbom.mjs` fetches the SPDX license list from GitHub at runtime (`fetch(SPDX_LICENSE_LIST)`).
- Files: `validate-sbom.mjs`
- Impact: Validation will fail if there's no internet access or if GitHub is down. Potential (though low) risk if the source is compromised.
- Fix approach: Bundle a local copy of the SPDX license list or provide a way to use a local file.

**Incomplete Validation:**
- Issue: `validate-sbom.mjs` is not a full CycloneDX schema validator and only checks a subset of rules.
- Files: `validate-sbom.mjs`
- Impact: An SBOM may pass this validator but still be invalid according to the CycloneDX schema or BSI TR-03183-2.
- Fix approach: Integrate an official CycloneDX JSON schema validator.

## Performance Bottlenecks

**Project Isolation via Copying:**
- Problem: The script copies the entire project (minus excluded dirs) to a temporary directory before running the generator.
- Files: `generate-sbom.mjs`
- Cause: `cpSync(projectPath, isolatedDir, ...)` is used to "isolate" the project.
- Improvement path: For large projects, this copy operation can be slow and consume significant disk space. Consider running the generator directly on the source or using a more efficient isolation method.

## Fragile Areas

**SBOM Post-processing Logic:**
- Files: `generate-sbom.mjs`
- Why fragile: Directly manipulates large, nested JSON objects with many assumptions about the input structure from `cdxgen`.
- Safe modification: Any changes to the post-processing logic should be verified against both `cdxgen` output and CycloneDX schema requirements.
- Test coverage: None.

## Test Coverage Gaps

**Missing Tests:**
- What's not tested: No unit tests or integration tests exist for `generate-sbom.mjs` or `validate-sbom.mjs`.
- Files: All files in the repository.
- Risk: Changes could introduce regressions or break compliance logic without being detected.
- Priority: High.

---

*Concerns audit: 2024-05-22*
