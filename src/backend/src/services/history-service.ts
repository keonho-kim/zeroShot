import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RunDetail, RunSummary } from "@backend/types/history.js";

const USER_RUN_DOCUMENTS = ["work-log.html", "result-report.html"] as const;

function parseRunMeta(raw: string): Record<string, string> {
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function runSortName(name: string): boolean {
  return /^\d{6}-\d{3}$/.test(name);
}

async function readNewRunSummary(projectRoot: string, name: string): Promise<RunSummary> {
  const runPath = join(projectRoot, "runs", name);
  const meta = parseRunMeta(await readFile(join(runPath, "run.meta"), "utf8").catch(() => ""));
  const workLog = await readFile(join(runPath, "work-log.html"), "utf8").catch(() => "");
  const resultReport = await readFile(join(runPath, "result-report.html"), "utf8").catch(() => "");
  return {
    name,
    path: runPath,
    createdAt: meta.created_at,
    mode: meta.run_mode || inferRunMode(`${workLog}\n${resultReport}`)
  };
}

function inferRunMode(content: string): string {
  const match = /Mode:\s*<code>(build|update)<\/code>/i.exec(content);
  return match?.[1]?.toLowerCase() ?? "";
}

async function listNewRuns(projectRoot: string): Promise<RunSummary[]> {
  const runsRoot = join(projectRoot, "runs");
  const entries = await readdir(runsRoot, { withFileTypes: true }).catch(() => []);
  return Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && runSortName(entry.name))
      .map((entry) => entry.name)
      .sort()
      .reverse()
      .map((name) => readNewRunSummary(projectRoot, name))
  );
}

async function listLegacyRuns(projectRoot: string): Promise<RunSummary[]> {
  const historyRoot = join(projectRoot, ".work.history");
  const entries = await readdir(historyRoot, { withFileTypes: true }).catch(() => []);
  const runs = entries
    .filter((entry) => entry.isDirectory() && runSortName(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  return Promise.all(
    runs.map(async (name) => {
      const runPath = join(historyRoot, name);
      const meta = parseRunMeta(await readFile(join(runPath, "run.meta"), "utf8").catch(() => ""));
      return {
        name,
        path: runPath,
        createdAt: meta.created_at,
        mode: meta.run_mode
      };
    })
  );
}

export async function listRuns(projectRoot: string): Promise<RunSummary[]> {
  const newRuns = await listNewRuns(projectRoot);
  if (newRuns.length > 0) {
    return newRuns;
  }
  return listLegacyRuns(projectRoot);
}

export async function readRunDetail(projectRoot: string, runName: string): Promise<RunDetail> {
  const runPath = join(projectRoot, "runs", runName);
  const meta = parseRunMeta(await readFile(join(runPath, "run.meta"), "utf8").catch(() => ""));
  const documents = Object.fromEntries(
    await Promise.all(
      USER_RUN_DOCUMENTS.map(async (documentName) => [
        documentName,
        await readFile(join(runPath, documentName), "utf8").catch(() => "")
      ])
    )
  );

  if (Object.values(documents).some(Boolean)) {
    return {
      summary: {
        name: runName,
        path: runPath,
        createdAt: meta.created_at,
        mode: meta.run_mode || inferRunMode(Object.values(documents).join("\n"))
      },
      meta: {},
      manifest: "",
      documents
    };
  }

  const legacyPath = join(projectRoot, ".work.history", runName);
  const metaRaw = await readFile(join(legacyPath, "run.meta"), "utf8");
  const manifest = await readFile(join(legacyPath, "logs", "000-manifest.tsv"), "utf8").catch(() => "");
  const legacyDocuments = Object.fromEntries(
    await Promise.all(
      ["REQUIREMENTS.md", "PLAN.md", "SPEC.md", "TEST_PLAN.md", "DONE.md", "CHANGES.md", "FINAL_REPORT.md"].map(async (documentName) => [
        documentName,
        await readFile(join(legacyPath, documentName), "utf8").catch(() => "")
      ])
    )
  );

  return {
    summary: {
      name: runName,
      path: legacyPath,
      createdAt: parseRunMeta(metaRaw).created_at,
      mode: parseRunMeta(metaRaw).run_mode
    },
    meta: parseRunMeta(metaRaw),
    manifest,
    documents: legacyDocuments
  };
}
