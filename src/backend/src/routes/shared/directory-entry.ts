import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { readProjectHistoryMeta } from "@backend/services/project-service";
import { getRelativeProjectPath } from "@backend/routes/shared/project-root";

export async function buildDirectoryEntry(projectRoot: string, absolutePath: string, allowedRoots: string[]) {
  const entryStats = await stat(absolutePath);
  const historyMeta = entryStats.isDirectory()
    ? await readProjectHistoryMeta(absolutePath)
    : { hasWorkHistory: false, runsCount: 0 };

  return {
    name: basename(absolutePath),
    path: absolutePath,
    relativePath: getRelativeProjectPath(projectRoot, absolutePath),
    isDirectory: entryStats.isDirectory(),
    isAllowedRoot: entryStats.isDirectory() ? allowedRoots.includes(absolutePath) : false,
    hasWorkHistory: historyMeta.hasWorkHistory,
    runsCount: historyMeta.runsCount
  };
}
