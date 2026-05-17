import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readProjectState } from "./project-service";

let tempDir = "";

async function makeTempProject() {
  tempDir = await mkdtemp(join(tmpdir(), "zeroshot-project-"));
  return tempDir;
}

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = "";
  }
});

describe("readProjectState", () => {
  test("uses ARCHITECT/PRODUCT.html as the product blueprint", async () => {
    const root = await makeTempProject();
    await mkdir(join(root, "ARCHITECT"), { recursive: true });
    await writeFile(join(root, "ARCHITECT", "PRODUCT.html"), "<!doctype html><html><body>Product</body></html>");

    const state = await readProjectState(root);

    expect(state.hasProductHtml).toBe(true);
    expect(state.buildEnabled).toBe(true);
    expect(state.isDirectoryEmpty).toBe(true);
  });

  test("requires both a build run and source code before UPDATE is enabled", async () => {
    const root = await makeTempProject();
    await writeFile(join(root, "PRODUCT.md"), "# Product\n");
    await mkdir(join(root, "runs", "260516-001"), { recursive: true });

    const withoutSource = await readProjectState(root);
    expect(withoutSource.runsCount).toBe(1);
    expect(withoutSource.hasSourceCode).toBe(false);
    expect(withoutSource.updateEnabled).toBe(false);

    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "main.ts"), "const ready = true;\n");

    const withSource = await readProjectState(root);
    expect(withSource.hasSourceCode).toBe(true);
    expect(withSource.sourceFileCount).toBe(1);
    expect(withSource.languageStats[0]?.language).toBe("TypeScript");
    expect(withSource.updateEnabled).toBe(true);
  });
});
