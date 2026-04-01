import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RunDetail, RunSummary } from "../types.js";

const DOCUMENT_NAMES = [
  "REQUIREMENTS.md",
  "PLAN.md",
  "SPEC.md",
  "TEST_PLAN.md",
  "DONE.md",
  "CHANGES.md",
  "FINAL_REPORT.md"
] as const;

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

export async function listRuns(projectRoot: string): Promise<RunSummary[]> {
  const historyRoot = join(projectRoot, ".work.history");
  const entries = await readdir(historyRoot, { withFileTypes: true }).catch(() => []);

  const runs = entries
    .filter((entry) => entry.isDirectory() && /^\d{6}-\d{3}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  return Promise.all(
    runs.map(async (name) => {
      const runPath = join(historyRoot, name);
      const metaPath = join(runPath, "run.meta");
      const meta = parseRunMeta(await readFile(metaPath, "utf8").catch(() => ""));

      return {
        name,
        path: runPath,
        createdAt: meta.created_at,
        mode: meta.run_mode
      };
    })
  );
}

export async function readRunDetail(projectRoot: string, runName: string): Promise<RunDetail> {
  const runPath = join(projectRoot, ".work.history", runName);
  const metaRaw = await readFile(join(runPath, "run.meta"), "utf8");
  const manifest = await readFile(join(runPath, "logs", "000-manifest.tsv"), "utf8").catch(() => "");

  const documents = Object.fromEntries(
    await Promise.all(
      DOCUMENT_NAMES.map(async (documentName) => [
        documentName,
        await readFile(join(runPath, documentName), "utf8").catch(() => "")
      ])
    )
  );

  return {
    summary: {
      name: runName,
      path: runPath,
      createdAt: parseRunMeta(metaRaw).created_at,
      mode: parseRunMeta(metaRaw).run_mode
    },
    meta: parseRunMeta(metaRaw),
    manifest,
    documents
  };
}
