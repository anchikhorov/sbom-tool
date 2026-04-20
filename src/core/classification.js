/**
 * Classify a component filename for the three BSI boolean properties:
 *   bsi:component:executable  → "executable" | "non-executable"
 *   bsi:component:archive     → "archive"    | "no archive"
 *   bsi:component:structured  → "structured" | "unstructured"
 *
 * Heuristic — cdxgen does not always expose the raw file extension,
 * so we derive it from component type, purl, and name.
 * 
 * @param {Object} comp - CycloneDX component object
 * @returns {Object} { executable, archive, structured }
 */
export function classifyComponent(comp) {
  const name = (comp.name ?? "").toLowerCase();
  const purl = (comp.purl ?? "").toLowerCase();
  const type = (comp.type ?? "library").toLowerCase();

  // Archives
  const archiveExts = [
    ".zip", ".tar", ".gz", ".tgz", ".bz2", ".xz", ".7z", 
    ".jar", ".war", ".ear", ".aar", ".whl", ".gem", ".nupkg"
  ];
  const isArchive = archiveExts.some((ext) => name.endsWith(ext)) || ["container", "platform"].includes(type);

  // Structured archives: metadata preserves original structure
  const structuredExts = [
    ".zip", ".jar", ".war", ".ear", ".aar", ".whl", ".gem", ".nupkg", 
    ".tar", ".tgz", ".tar.gz", ".tar.bz2", ".tar.xz"
  ];
  const isStructured = structuredExts.some((ext) => name.endsWith(ext)) || type === "container";

  // Executables: compiled or interpreted code
  const execTypes = ["library", "application", "framework", "container", "firmware", "device-driver"];
  const execExts = [
    ".js", ".mjs", ".cjs", ".ts", ".py", ".sh", ".bash", ".rb", ".pl", ".php",
    ".exe", ".dll", ".so", ".dylib", ".jar", ".wasm"
  ];
  const isExecutable =
    execTypes.includes(type) ||
    execExts.some((ext) => name.endsWith(ext)) ||
    purl.startsWith("pkg:npm") ||
    purl.startsWith("pkg:pypi") ||
    purl.startsWith("pkg:maven") ||
    purl.startsWith("pkg:gem") ||
    purl.startsWith("pkg:cargo");

  return {
    executable: isExecutable ? "executable" : "non-executable",
    archive: isArchive ? "archive" : "no archive",
    structured: isStructured ? "structured" : "unstructured",
  };
}
