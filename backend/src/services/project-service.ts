import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { exists } from "../core/path-guards.js";
import type { ProjectState } from "../types.js";

export async function readProjectState(projectRoot: string): Promise<ProjectState> {
  const productPath = join(projectRoot, "PRODUCT.md");
  const updatePath = join(projectRoot, "UPDATE.md");
  const historyRoot = join(projectRoot, ".work.history");
  const hasHistory = await exists(historyRoot);
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
    hasUpdate: await exists(updatePath),
    workHistoryExists: hasHistory,
    runsCount: runs.length,
    latestRunName: runs.at(-1),
    updateEnabled: hasHistory && runs.length > 0
  };
}
