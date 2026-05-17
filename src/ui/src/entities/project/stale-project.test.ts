import { describe, expect, test } from "bun:test";
import { clearMissingProjectSelection, hasValidSelectedProject, isMissingSelectedProjectError } from "@/entities/project/stale-project";

describe("stale project selection", () => {
  test("detects only missing project HTTP errors", () => {
    expect(isMissingSelectedProjectError({ response: { status: 404 } })).toBe(true);
    expect(isMissingSelectedProjectError({ response: { status: 500 } })).toBe(false);
    expect(isMissingSelectedProjectError(new Error("network"))).toBe(false);
  });

  test("clears selected and candidate project paths without creating an error state", () => {
    const calls: Array<[string, unknown]> = [];

    clearMissingProjectSelection({
      setProjectRoot: (value) => calls.push(["projectRoot", value]),
      setProjectState: (value) => calls.push(["projectState", value]),
      setCandidateProjectPath: (value) => calls.push(["candidateProjectPath", value]),
      setSelectedBrowserEntryPath: (value) => calls.push(["selectedBrowserEntryPath", value]),
      setProjectPickerOpen: (value) => calls.push(["projectPickerOpen", value])
    });

    expect(calls).toEqual([
      ["projectRoot", ""],
      ["projectState", null],
      ["candidateProjectPath", ""],
      ["selectedBrowserEntryPath", ""],
      ["projectPickerOpen", true]
    ]);
  });

  test("requires both a selected path and loaded project state before bootstrap", () => {
    const state = {
      projectRoot: "/tmp/project",
      hasProduct: false,
      hasProductHtml: false,
      hasDesign: false,
      hasUpdate: false,
      hasSourceCode: false,
      isDirectoryEmpty: false,
      languageStats: [],
      buildEnabled: false,
      workHistoryExists: false,
      runsCount: 0,
      sourceBytes: 0,
      sourceFileCount: 0,
      updateEnabled: false
    };

    expect(hasValidSelectedProject("", state)).toBe(false);
    expect(hasValidSelectedProject("/tmp/project", null)).toBe(false);
    expect(hasValidSelectedProject("/tmp/project", state)).toBe(true);
  });
});
