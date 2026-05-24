import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { upsertArtifactManifest, writeArtifactFile } from "@backend/services/file/service";
import {
  appendWorkflowLogEvent,
  createWorkflowLogRecord,
  readWorkflowLogBoard,
  readWorkflowLogRecord,
  resetWorkflowLogDatabaseForTests
} from "@backend/services/workflow-log/service";

let tempRoot = "";
const originalDbPath = process.env.ZEROSHOT_APP_DB;

beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "zeroshot-workflow-log-"));
  process.env.ZEROSHOT_APP_DB = join(tempRoot, "app.sqlite");
});

afterEach(async () => {
  resetWorkflowLogDatabaseForTests();
  if (originalDbPath === undefined) {
    delete process.env.ZEROSHOT_APP_DB;
  } else {
    process.env.ZEROSHOT_APP_DB = originalDbPath;
  }
  await rm(tempRoot, { recursive: true, force: true });
});

describe("workflow log service", () => {
  test("stores records, events, and returns newest records first", async () => {
    const projectRoot = join(tempRoot, "project");
    const older = await createWorkflowLogRecord({
      projectRoot,
      stage: "product",
      section: "logs",
      kind: "log",
      title: "Older",
      summary: "old"
    });
    await createWorkflowLogRecord({
      projectRoot,
      stage: "product",
      section: "logs",
      kind: "log",
      title: "Newer",
      summary: "new"
    });
    await appendWorkflowLogEvent(older.id, {
      type: "message",
      message: "Started",
      payload: { ok: true }
    });

    const board = await readWorkflowLogBoard(projectRoot);
    const product = board.stages.find((stage) => stage.stage === "product");
    const logs = product?.sections.find((section) => section.section === "logs");

    expect(product?.enabled).toBe(true);
    expect(logs?.records.map((record) => record.title)).toEqual(["Newer", "Older"]);

    const detail = await readWorkflowLogRecord(projectRoot, older.id);
    expect(detail.events[0]?.message).toBe("Started");
    expect(detail.events[0]?.payload).toEqual({ ok: true });
  });

  test("enables artifact sections from project artifacts and disables empty stages", async () => {
    const projectRoot = join(tempRoot, "project");
    await writeArtifactFile(projectRoot, "ARCHITECT/PRODUCT.html", "<html><body>Product</body></html>");
    await writeArtifactFile(projectRoot, "DESIGN/DESIGN.html", "<html><body>Design</body></html>");
    await upsertArtifactManifest(projectRoot, [{
      path: "ARCHITECT/PRODUCT.html",
      type: "text/html",
      title: "Product blueprint",
      entry: true
    }]);

    const board = await readWorkflowLogBoard(projectRoot);
    const product = board.stages.find((stage) => stage.stage === "product");
    const design = board.stages.find((stage) => stage.stage === "design");
    const build = board.stages.find((stage) => stage.stage === "build");
    const blueprint = product?.sections.find((section) => section.section === "blueprint");
    const preview = design?.sections.find((section) => section.section === "preview");

    expect(product?.enabled).toBe(true);
    expect(blueprint?.enabled).toBe(true);
    expect(blueprint?.records[0]?.title).toBe("Product blueprint");
    expect(design?.enabled).toBe(true);
    expect(preview?.enabled).toBe(true);
    expect(preview?.records[0]?.summary).toBe("DESIGN/DESIGN.html");
    expect(build?.enabled).toBe(false);
  });
});
