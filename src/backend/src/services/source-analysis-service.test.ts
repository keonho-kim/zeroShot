import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyzeProjectSource } from "@backend/services/source-analysis-service";

let tempDir = "";

async function makeTempProject() {
  tempDir = await mkdtemp(join(tmpdir(), "zeroshot-source-"));
  return tempDir;
}

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = "";
  }
});

describe("analyzeProjectSource", () => {
  test("detects source files and computes language percentages", async () => {
    const root = await makeTempProject();
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "main.ts"), "const value = 1;\n");
    await writeFile(join(root, "src", "style.css"), "body { color: red; }\n");

    const result = await analyzeProjectSource(root);

    expect(result.hasSourceCode).toBe(true);
    expect(result.sourceFileCount).toBe(2);
    expect(result.sourceBytes).toBeGreaterThan(0);
    expect(result.languageStats.map((stat) => stat.language).sort()).toEqual(["CSS", "TypeScript"]);
  });

  test("ignores ZeroShot docs, run reports, dependencies, and lockfiles", async () => {
    const root = await makeTempProject();
    await mkdir(join(root, "runs", "260516-001"), { recursive: true });
    await mkdir(join(root, "node_modules", "pkg"), { recursive: true });
    await writeFile(join(root, "PRODUCT.md"), "# Product\n");
    await writeFile(join(root, "UPDATE.md"), "# Update\n");
    await writeFile(join(root, "bun.lock"), "lock\n");
    await writeFile(join(root, "runs", "260516-001", "main.ts"), "const ignored = true;\n");
    await writeFile(join(root, "node_modules", "pkg", "index.js"), "module.exports = {};\n");

    const result = await analyzeProjectSource(root);

    expect(result.hasSourceCode).toBe(false);
    expect(result.sourceFileCount).toBe(0);
    expect(result.languageStats).toEqual([]);
  });
});
