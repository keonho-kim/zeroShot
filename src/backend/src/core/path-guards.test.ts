import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertProjectRootWithinRoots } from "./path-guards";

let tempDir = "";

async function makeTempRoot() {
  tempDir = await mkdtemp(join(tmpdir(), "zeroshot-path-guard-"));
  return tempDir;
}

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = "";
  }
});

describe("assertProjectRootWithinRoots", () => {
  test("returns 404 for a missing project folder", async () => {
    const root = await makeTempRoot();

    await expect(assertProjectRootWithinRoots(join(root, "missing"), [root], "browsable roots")).rejects.toMatchObject({
      message: "Project folder no longer exists.",
      statusCode: 404
    });
  });

  test("keeps 403 for an existing path outside allowed roots", async () => {
    const root = await makeTempRoot();
    const outside = await mkdtemp(join(tmpdir(), "zeroshot-outside-"));

    try {
      await expect(assertProjectRootWithinRoots(outside, [root], "browsable roots")).rejects.toMatchObject({
        message: "Path is outside browsable roots",
        statusCode: 403
      });
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});
