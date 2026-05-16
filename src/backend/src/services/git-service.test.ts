import { afterEach, describe, expect, test } from "bun:test";
import git from "isomorphic-git";
import fs from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readGitStatusMatrix } from "./git-service";

let tempDir = "";

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = "";
  }
});

describe("readGitStatusMatrix", () => {
  test("reads repository file state with isomorphic-git", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "zeroshot-git-"));
    await git.init({ fs, dir: tempDir });
    await writeFile(join(tempDir, "PRODUCT.md"), "# Product\n");

    const matrix = await readGitStatusMatrix(tempDir);

    expect(matrix.some(([filepath]) => filepath === "PRODUCT.md")).toBe(true);
  });
});
