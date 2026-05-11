import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { exists } from "../core/path-guards.js";
import type { ProjectState } from "../types.js";

const nonProjectEntries = new Set([".DS_Store", ".work.history", "PRODUCT.md", "PRODUCT.html", "UPDATE.md"]);

async function isProjectDirectoryEmpty(projectRoot: string): Promise<boolean> {
  const entries = await readdir(projectRoot, { withFileTypes: true });
  return entries.every((entry) => nonProjectEntries.has(entry.name));
}

export async function readProjectState(projectRoot: string): Promise<ProjectState> {
  const productPath = join(projectRoot, "PRODUCT.md");
  const productHtmlPath = join(projectRoot, "PRODUCT.html");
  const updatePath = join(projectRoot, "UPDATE.md");
  const historyRoot = join(projectRoot, ".work.history");
  const hasHistory = await exists(historyRoot);
  const hasProductHtml = await exists(productHtmlPath);
  const isDirectoryEmpty = await isProjectDirectoryEmpty(projectRoot);
  let runs: string[] = [];

  if (hasHistory) {
    runs = (await readdir(historyRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && /^\d{6}-\d{3}$/.test(entry.name))
      .map((entry) => entry.name)
      .sort();
  }

  return {
    projectRoot,
    hasProduct: await exists(productPath),
    hasProductHtml,
    hasUpdate: await exists(updatePath),
    isDirectoryEmpty,
    buildEnabled: !isDirectoryEmpty || hasProductHtml,
    workHistoryExists: hasHistory,
    runsCount: runs.length,
    latestRunName: runs.at(-1),
    updateEnabled: hasHistory && runs.length > 0
  };
}

export async function readProjectHistoryMeta(projectRoot: string): Promise<{ hasWorkHistory: boolean; runsCount: number }> {
  const historyRoot = join(projectRoot, ".work.history");
  const hasHistory = await exists(historyRoot);
  if (!hasHistory) {
    return { hasWorkHistory: false, runsCount: 0 };
  }

  const runs = (await readdir(historyRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^\d{6}-\d{3}$/.test(entry.name))
    .map((entry) => entry.name);

  return {
    hasWorkHistory: true,
    runsCount: runs.length
  };
}
