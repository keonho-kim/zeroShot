import { describe, expect, test } from "bun:test";
import { mergeTreeChildren, prioritizeSelectedDirectory } from "@/components/project-picker/project-picker-utils";

describe("project picker tree utilities", () => {
  test("marks an empty directory as loaded", () => {
    expect(mergeTreeChildren({}, "/empty", [])).toEqual({ "/empty": [] });
  });

  test("keeps the same tree object when an already loaded empty directory stays empty", () => {
    const tree = { "/empty": [] };
    expect(mergeTreeChildren(tree, "/empty", [])).toBe(tree);
  });

  test("moves the selected directory to the top of the rendered list", () => {
    const entries = [
      { name: "a", path: "/a", relativePath: "a", isDirectory: true, isAllowedRoot: false, hasWorkHistory: false, runsCount: 0 },
      { name: "b", path: "/b", relativePath: "b", isDirectory: true, isAllowedRoot: false, hasWorkHistory: false, runsCount: 0 },
      { name: "file", path: "/file.txt", relativePath: "file.txt", isDirectory: false, isAllowedRoot: false, hasWorkHistory: false, runsCount: 0 }
    ];

    expect(prioritizeSelectedDirectory(entries, "/b").map((entry) => entry.path)).toEqual(["/b", "/a", "/file.txt"]);
  });

  test("does not move selected files above directories", () => {
    const entries = [
      { name: "a", path: "/a", relativePath: "a", isDirectory: true, isAllowedRoot: false, hasWorkHistory: false, runsCount: 0 },
      { name: "file", path: "/file.txt", relativePath: "file.txt", isDirectory: false, isAllowedRoot: false, hasWorkHistory: false, runsCount: 0 }
    ];

    expect(prioritizeSelectedDirectory(entries, "/file.txt")).toBe(entries);
  });
});
