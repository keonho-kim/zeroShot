import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { loadAppConfig } from "@backend/config/app-config.js";
import { isWithin, resolveExistingPath } from "@backend/core/path-guards.js";
import { architectProductPath, designEntryPath } from "@backend/services/file-service.js";
import { listRuns, readRunDetail } from "@backend/services/history-service.js";
import { listStoredArchitectSessions, listStoredDesignSessions, listStoredSessionProjectRoots } from "@backend/services/app-storage-service.js";
import { readProjectHistoryMeta } from "@backend/services/project-service.js";
import type { RunSummary, WorkLogEntryDetail, WorkLogEntrySummary, WorkLogLabel, WorkLogProjectSummary } from "@backend/types.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function entryId(kind: "architect" | "makeover" | "run", id: string): string {
  return `${kind}:${id}`;
}

function splitEntryId(id: string): { kind: "architect" | "makeover" | "run"; value: string } {
  const index = id.indexOf(":");
  const kind = id.slice(0, index);
  const value = id.slice(index + 1);
  if ((kind === "architect" || kind === "makeover" || kind === "run") && value) {
    return { kind, value };
  }
  throw Object.assign(new Error("Unknown log entry."), { statusCode: 404 });
}

function runLabel(run: RunSummary): WorkLogLabel {
  return run.mode?.toLowerCase() === "update" ? "UPDATE" : "BUILD";
}

function sessionHtml(label: WorkLogLabel, title: string, summary: string, details: Array<[string, string]>): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(label)} ${escapeHtml(title)}</title></head>
<body>
  <main>
    <header>
      <p class="meta"><span>${escapeHtml(label)}</span></p>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(summary)}</p>
    </header>
    ${details.map(([name, value]) => `<section class="panel"><h2>${escapeHtml(name)}</h2><pre><code>${escapeHtml(value)}</code></pre></section>`).join("\n")}
  </main>
</body>
</html>`;
}

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
  const childRoots = (await Promise.all(allowedRoots.map((root) => directChildDirectories(root)))).flat();
  const candidates = [...allowedRoots, ...childRoots, ...sessionRoots];
  return Array.from(new Set(candidates.filter((candidate) => allowedRoots.some((root) => isWithin(root, candidate)))));
}

export async function listWorkLogProjects(): Promise<WorkLogProjectSummary[]> {
  const candidates = await listCandidateProjectRoots();
  const projects = await Promise.all(
    candidates.map(async (projectRoot) => {
      const [history, architectSessions, designSessions, runs] = await Promise.all([
        readProjectHistoryMeta(projectRoot),
        listStoredArchitectSessions(projectRoot),
        listStoredDesignSessions(projectRoot),
        listRuns(projectRoot)
      ]);
      const conversationsCount = architectSessions.length + designSessions.length + runs.length;
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

export async function listWorkLogEntries(projectRoot: string): Promise<WorkLogEntrySummary[]> {
  const [architectSessions, designSessions, runs] = await Promise.all([
    listStoredArchitectSessions(projectRoot),
    listStoredDesignSessions(projectRoot),
    listRuns(projectRoot)
  ]);
  const architectEntries = architectSessions.map((session) => ({
    id: entryId("architect", session.id),
    label: "ARCHITECT" as const,
    title: session.title,
    summary: session.summary,
    createdAt: session.createdAt
  }));
  const designEntries = designSessions.map((session) => ({
    id: entryId("makeover", session.id),
    label: "MAKEOVER" as const,
    title: session.title,
    summary: session.summary,
    createdAt: session.createdAt
  }));
  const runEntries = runs.map((run) => {
    const label = runLabel(run);
    return {
      id: entryId("run", run.name),
      label,
      title: `${label} ${run.name}`,
      summary: run.mode ? `${run.mode} run output` : "Run output",
      createdAt: run.createdAt
    };
  });

  return [...architectEntries, ...designEntries, ...runEntries]
    .sort((a, b) => (b.createdAt ?? b.title).localeCompare(a.createdAt ?? a.title));
}

export async function readWorkLogEntryDetail(projectRoot: string, id: string): Promise<WorkLogEntryDetail> {
  const { kind, value } = splitEntryId(id);
  if (kind === "run") {
    const detail = await readRunDetail(projectRoot, value);
    const label = runLabel(detail.summary);
    return {
      summary: {
        id,
        label,
        title: `${label} ${detail.summary.name}`,
        summary: detail.summary.mode ? `${detail.summary.mode} run output` : "Run output",
        createdAt: detail.summary.createdAt
      },
      documents: detail.documents
    };
  }

  if (kind === "architect") {
    const session = (await listStoredArchitectSessions(projectRoot)).find((item) => item.id === value);
    if (!session) {
      throw Object.assign(new Error("ARCHITECT log entry not found."), { statusCode: 404 });
    }
    const productHtml = await readFile(join(projectRoot, architectProductPath), "utf8").catch(() => "");
    return {
      summary: {
        id,
        label: "ARCHITECT",
        title: session.title,
        summary: session.summary,
        createdAt: session.createdAt
      },
      documents: {
        "conversation.html": sessionHtml("ARCHITECT", session.title, session.summary, [["User goal", session.goal]]),
        "decisions.json": JSON.stringify(JSON.parse(session.decisionsJson), null, 2),
        ...(productHtml ? { [architectProductPath]: productHtml } : {})
      }
    };
  }

  const session = (await listStoredDesignSessions(projectRoot)).find((item) => item.id === value);
  if (!session) {
    throw Object.assign(new Error("MAKEOVER log entry not found."), { statusCode: 404 });
  }
  const designHtml = await readFile(join(projectRoot, designEntryPath), "utf8").catch(() => "");
  const response = JSON.parse(session.responseJson) as { chatMessage?: string; designMarkdown?: string };
  return {
    summary: {
      id,
      label: "MAKEOVER",
      title: session.title,
      summary: session.summary,
      createdAt: session.createdAt
    },
    documents: {
      "conversation.html": sessionHtml("MAKEOVER", session.title, session.summary, [
        ["Assistant message", response.chatMessage ?? ""],
        ["Design brief", response.designMarkdown ?? ""]
      ]),
      "runtime.json": JSON.stringify(response, null, 2),
      ...(designHtml ? { [designEntryPath]: designHtml } : {})
    }
  };
}
