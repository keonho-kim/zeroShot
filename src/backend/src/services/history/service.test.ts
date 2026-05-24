import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listRuns, readRunDetail } from "@backend/services/history/service";

let tempDir = "";

async function makeTempProject() {
  tempDir = await mkdtemp(join(tmpdir(), "zeroshot-history-"));
  return tempDir;
}

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = "";
  }
});

describe("history service", () => {
  test("reads user-facing run HTML from runs directory", async () => {
    const root = await makeTempProject();
    const runDir = join(root, "runs", "260516-001");
    await mkdir(runDir, { recursive: true });
    await writeFile(join(runDir, "work-log.html"), "<h1>Work</h1><span>Mode: <code>update</code></span>");
    await writeFile(join(runDir, "result-report.html"), "<h1>Result</h1>");

    const runs = await listRuns(root);
    expect(runs.map((run) => run.name)).toEqual(["260516-001"]);
    expect(runs[0]?.mode).toBe("update");

    const detail = await readRunDetail(root, "260516-001");
    expect(detail.summary.mode).toBe("update");
    expect(detail.documents["work-log.html"]).toContain("Work");
    expect(detail.documents["result-report.html"]).toContain("Result");
    expect(Object.keys(detail.documents).sort()).toEqual(["result-report.html", "work-log.html"]);
  });
});
