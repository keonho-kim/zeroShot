export type HighlightLanguage = "bash" | "diff" | "json" | "markdown" | "plaintext" | "typescript";

const extensionLanguage: Record<string, HighlightLanguage> = {
  ".bash": "bash",
  ".diff": "diff",
  ".json": "json",
  ".md": "markdown",
  ".patch": "diff",
  ".sh": "bash",
  ".ts": "typescript",
  ".tsx": "typescript"
};

export function languageForDocument(path: string): HighlightLanguage {
  const normalized = path.toLowerCase();
  const extension = Object.keys(extensionLanguage).find((suffix) => normalized.endsWith(suffix));
  return extension ? extensionLanguage[extension] : "plaintext";
}
