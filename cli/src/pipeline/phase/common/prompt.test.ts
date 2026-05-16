import { describe, expect, test } from "bun:test";
import { buildPrompt } from "@cli/pipeline/phase/common/prompt";
import type { PipelineContext } from "@cli/pipeline/types";

function context(mode: "build" | "update"): PipelineContext {
  return {
    mode,
    projectRoot: "/tmp/project",
    toolRoot: "/tmp/tool",
    productFile: "/tmp/project/PRODUCT.html",
    updateFile: "/tmp/project/UPDATE.md",
    workRoot: "/tmp/project/.zeroshot",
    activeRunFile: "/tmp/project/.zeroshot/active.json",
    runDir: "/tmp/project/runs/example",
    runName: "example",
    runLogDir: "/tmp/project/runs/example/logs",
    runInputDir: "/tmp/project/runs/example/input",
    outputsDir: "/tmp/project/runs/example/outputs",
    previousRunDir: "",
    phaseSeq: 0,
    pipelineNote: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    compactState: {
      goalSummary: "",
      workQueue: [],
      completedTasks: [],
      changedFiles: [],
      validation: [],
      openIssues: [],
      nextSteps: [],
      latestSummary: ""
    },
    options: {
      approval: "never",
      sandbox: "workspace-write",
      maxIters: 1,
      stallLimit: 1,
      planReasoning: "medium",
      execReasoning: "medium",
      validateReasoning: "medium",
      closeoutReasoning: "medium",
      responseLanguage: "ko",
      additionalDirectories: []
    }
  };
}

describe("pipeline prompt", () => {
  test("includes backend architecture guidance for all runs", () => {
    const prompt = buildPrompt(context("build"), "implement", "medium", "Implement", "");

    expect(prompt).toContain("Backend architecture guidance");
    expect(prompt).toContain("Organize maintainable backend code by domain");
  });

  test("includes backend refactoring guidance in update mode", () => {
    const prompt = buildPrompt(context("update"), "implement", "medium", "Implement", "");

    expect(prompt).toContain("Update-mode refactoring guidance");
    expect(prompt).toContain("YAGNI, DRY, single responsibility");
    expect(prompt).toContain("Promote functions or data objects to classes only when lifecycle");
  });
});
