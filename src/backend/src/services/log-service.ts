import { readdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { loadAppConfig } from "@backend/config/app-config.js";
import { isWithin, resolveExistingPath } from "@backend/core/path-guards.js";
import { listRuns } from "@backend/services/history-service.js";
import { listStoredArchitectSessions, listStoredDesignSessions, listStoredSessionProjectRoots } from "@backend/services/app-storage-service.js";
import { readProjectHistoryMeta } from "@backend/services/project-service.js";
import { countWorkflowLogRecords, listWorkflowLogProjectRoots } from "@backend/services/workflow-log-service.js";
import type { WorkLogProjectSummary } from "@backend/types/history.js";

async function existingDirectories(paths: string[]): Promise<string[]> {
  const resolved = await Promise.all(
    paths.map(async (path) => {
      const info = await stat(path).catch(() => null);
      if (!info?.isDirectory()) {
        return null;
      }
      return resolveExistingPath(path).catch(() => null);
    })
  );
  return resolved.filter((path): path is string => Boolean(path));
}

async function directChildDirectories(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const paths = entries
    .filter((entry) => entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git")
    .map((entry) => join(root, entry.name));
  return existingDirectories(paths);
}

async function listCandidateProjectRoots(): Promise<string[]> {
  const config = await loadAppConfig();
  const allowedRoots = await existingDirectories(config.allowedRoots);
  const sessionRoots = await existingDirectories(await listStoredSessionProjectRoots());
  const workflowRoots = await existingDirectories(await listWorkflowLogProjectRoots());
  const childRoots = (await Promise.all(allowedRoots.map((root) => directChildDirectories(root)))).flat();
  const candidates = [...allowedRoots, ...childRoots, ...sessionRoots, ...workflowRoots];
  return Array.from(new Set(candidates.filter((candidate) => allowedRoots.some((root) => isWithin(root, candidate)))));
}

export async function listWorkLogProjects(): Promise<WorkLogProjectSummary[]> {
  const candidates = await listCandidateProjectRoots();
  const projects = await Promise.all(
    candidates.map(async (projectRoot) => {
      const [history, architectSessions, designSessions, runs, workflowRecordsCount] = await Promise.all([
        readProjectHistoryMeta(projectRoot),
        listStoredArchitectSessions(projectRoot),
        listStoredDesignSessions(projectRoot),
        listRuns(projectRoot),
        countWorkflowLogRecords(projectRoot)
      ]);
      const conversationsCount = workflowRecordsCount + architectSessions.length + designSessions.length + runs.length;
      if (!history.hasWorkHistory && conversationsCount === 0) {
        return null;
      }
      const dates = [
        ...architectSessions.map((session) => session.createdAt),
        ...designSessions.map((session) => session.createdAt),
        ...runs.map((run) => run.createdAt ?? "")
      ].filter(Boolean).sort();
      const summary: WorkLogProjectSummary = {
        projectRoot,
        name: basename(projectRoot),
        runsCount: history.runsCount,
        conversationsCount,
        ...(dates.at(-1) ? { lastActivityAt: dates.at(-1) } : {})
      };
      return summary;
    })
  );
  return projects
    .filter((project): project is WorkLogProjectSummary => project !== null)
    .sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? "") || a.name.localeCompare(b.name));
}
