import { readdir, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import type { LanguageStat } from "@backend/types/project.js";

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".turbo",
  ".work.history",
  "ARCHITECT",
  "DESIGN",
  "runs",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target"
]);

const ignoredFiles = new Set([
  "bun.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "PRODUCT.md",
  "PRODUCT.html",
  "DESIGN.md",
  "DESIGN.runtime.json",
  "UPDATE.md",
  "artifacts.json"
]);

const languageByExtension = new Map<string, string>([
  [".c", "C"],
  [".cc", "C++"],
  [".cpp", "C++"],
  [".cs", "C#"],
  [".css", "CSS"],
  [".go", "Go"],
  [".h", "C/C++ Header"],
  [".hpp", "C++ Header"],
  [".html", "HTML"],
  [".java", "Java"],
  [".js", "JavaScript"],
  [".jsx", "JavaScript"],
  [".json", "JSON"],
  [".kt", "Kotlin"],
  [".kts", "Kotlin"],
  [".md", "Markdown"],
  [".mjs", "JavaScript"],
  [".mts", "TypeScript"],
  [".py", "Python"],
  [".rs", "Rust"],
  [".sh", "Shell"],
  [".swift", "Swift"],
  [".ts", "TypeScript"],
  [".tsx", "TypeScript"],
  [".vue", "Vue"],
  [".yaml", "YAML"],
  [".yml", "YAML"]
]);

function percentage(bytes: number, total: number): number {
  return total > 0 ? Math.round((bytes / total) * 1000) / 10 : 0;
}

export async function analyzeProjectSource(projectRoot: string): Promise<{
  hasSourceCode: boolean;
  sourceBytes: number;
  sourceFileCount: number;
  languageStats: LanguageStat[];
}> {
  const languages = new Map<string, number>();
  let sourceFileCount = 0;
  let sourceBytes = 0;

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          await visit(join(directory, entry.name));
        }
        continue;
      }

      if (!entry.isFile() || ignoredFiles.has(entry.name)) {
        continue;
      }

      const language = languageByExtension.get(extname(entry.name).toLowerCase());
      if (!language) {
        continue;
      }

      const fileStats = await stat(join(directory, entry.name));
      sourceFileCount += 1;
      sourceBytes += fileStats.size;
      languages.set(language, (languages.get(language) ?? 0) + fileStats.size);
    }
  }

  await visit(projectRoot);

  return {
    hasSourceCode: sourceFileCount > 0,
    sourceBytes,
    sourceFileCount,
    languageStats: Array.from(languages.entries())
      .map(([language, bytes]) => ({
        language,
        bytes,
        percentage: percentage(bytes, sourceBytes)
      }))
      .sort((a, b) => b.bytes - a.bytes || a.language.localeCompare(b.language))
  };
}
