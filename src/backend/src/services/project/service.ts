import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { exists } from "@backend/core/path-guards";
import { architectProductPath, designEntryPath } from "@backend/services/file/service";
import { analyzeProjectSource } from "@backend/services/source-analysis/service";
import type { ProjectState } from "@backend/types/project";

const nonProjectEntries = new Set([".DS_Store", ".work.history", "runs", "ARCHITECT", "DESIGN", "PRODUCT.md", "PRODUCT.html", "DESIGN.md", "DESIGN.runtime.json", "artifacts.json", "UPDATE.md"]);

async function isProjectDirectoryEmpty(projectRoot: string): Promise<boolean> {
  const entries = await readdir(projectRoot, { withFileTypes: true });
  return entries.every((entry) => nonProjectEntries.has(entry.name));
}

async function listRunNames(projectRoot: string): Promise<{ hasHistory: boolean; runs: string[] }> {
  const runsRoot = join(projectRoot, "runs");
  const legacyRoot = join(projectRoot, ".work.history");
  const readRuns = async (root: string) => (await readdir(root, { withFileTypes: true }).catch(() => []))
    .filter((entry) => entry.isDirectory() && /^\d{6}-\d{3}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const runs = await readRuns(runsRoot);
  if (runs.length > 0) {
    return { hasHistory: true, runs };
  }
  const legacyRuns = await readRuns(legacyRoot);
  return { hasHistory: legacyRuns.length > 0, runs: legacyRuns };
}

export async function readProjectState(projectRoot: string): Promise<ProjectState> {
  const productHtmlPath = join(projectRoot, architectProductPath);
  const designPath = join(projectRoot, designEntryPath);
  const updatePath = join(projectRoot, "UPDATE.md");
  const hasProductHtml = await exists(productHtmlPath);
  const [isDirectoryEmpty, source, history] = await Promise.all([
    isProjectDirectoryEmpty(projectRoot),
    analyzeProjectSource(projectRoot),
    listRunNames(projectRoot)
  ]);

  return {
    projectRoot,
    hasProduct: hasProductHtml,
    hasProductHtml,
    hasDesign: await exists(designPath),
    hasUpdate: await exists(updatePath),
    hasSourceCode: source.hasSourceCode,
    isDirectoryEmpty,
    languageStats: source.languageStats,
    buildEnabled: !isDirectoryEmpty || hasProductHtml,
    workHistoryExists: history.hasHistory,
    runsCount: history.runs.length,
    latestRunName: history.runs.at(-1),
    sourceBytes: source.sourceBytes,
    sourceFileCount: source.sourceFileCount,
    updateEnabled: history.hasHistory && history.runs.length > 0 && source.hasSourceCode
  };
}

export async function readProjectHistoryMeta(projectRoot: string): Promise<{ hasWorkHistory: boolean; runsCount: number }> {
  const { hasHistory, runs } = await listRunNames(projectRoot);
  return {
    hasWorkHistory: hasHistory,
    runsCount: runs.length
  };
}
