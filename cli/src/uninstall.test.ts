import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { buildCleanupScript, type UninstallPlan } from "./uninstall.js";

describe("uninstall cleanup script", () => {
  test("removes only the planned ZeroShot targets", async () => {
    const root = await mkdtemp(join(tmpdir(), "zeroshot-uninstall-test-"));
    const binPath = join(root, "bin", "zeroshot");
    const packageRoot = join(root, "node_modules", "@keonhokim", "zeroshot");
    const dataRoot = join(root, ".zeroshot");
    const survivor = join(root, "keep.txt");

    await mkdir(join(root, "bin"), { recursive: true });
    await mkdir(packageRoot, { recursive: true });
    await mkdir(dataRoot, { recursive: true });
    await writeFile(binPath, "bin");
    await writeFile(join(packageRoot, "package.json"), "{}");
    await writeFile(join(dataRoot, "config.toml"), "");
    await writeFile(survivor, "keep");

    const plan: UninstallPlan = {
      binPaths: [binPath],
      packageRoots: [packageRoot],
      dataRoots: [dataRoot],
      scopeDirs: [join(root, "node_modules", "@keonhokim")]
    };

    const scriptPath = join(root, "cleanup.sh");
    await writeFile(scriptPath, buildCleanupScript(plan), "utf8");

    const proc = Bun.spawn(["sh", scriptPath], { stdout: "pipe", stderr: "pipe" });
    expect(await proc.exited).toBe(0);
    expect(await readFile(survivor, "utf8")).toBe("keep");
    await expect(readFile(binPath, "utf8")).rejects.toThrow();
    await expect(readFile(join(packageRoot, "package.json"), "utf8")).rejects.toThrow();
    await expect(readFile(join(dataRoot, "config.toml"), "utf8")).rejects.toThrow();

    await rm(root, { recursive: true, force: true });
  });
});
