import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPrompt } from "@cli/pipeline/phase/common/prompt";
import type { PipelineContext } from "@cli/pipeline/types";

function context(mode: "build" | "update", projectRoot = "/tmp/project"): PipelineContext {
  return {
    mode,
    projectRoot,
    toolRoot: "/tmp/tool",
    productFile: `${projectRoot}/ARCHITECT/PRODUCT.html`,
    updateFile: `${projectRoot}/UPDATE.md`,
    workRoot: `${projectRoot}/.zeroshot`,
    activeRunFile: `${projectRoot}/.zeroshot/active.json`,
    runDir: `${projectRoot}/runs/example`,
    runName: "example",
    runLogDir: `${projectRoot}/runs/example/logs`,
    runInputDir: `${projectRoot}/runs/example/input`,
    outputsDir: `${projectRoot}/runs/example/outputs`,
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
  test("starts executable pipeline prompts with the goal command", () => {
    const prompt = buildPrompt(context("build"), "implement", "medium", "Implement", "");

    expect(prompt.startsWith("/goal")).toBe(true);
  });

  test("includes backend architecture guidance for all runs", () => {
    const prompt = buildPrompt(context("build"), "implement", "medium", "Implement", "");

    expect(prompt).toContain("Backend architecture guidance");
    expect(prompt).toContain("services/<domain>/{const|constants");
    expect(prompt).toContain("app, routes, services, integrations, core, config, and types");
    expect(prompt).toContain("ARCHITECT/PRODUCT.html");
  });

  test("includes frontend architecture guidance for all runs", () => {
    const prompt = buildPrompt(context("build"), "implement", "medium", "Implement", "");

    expect(prompt).toContain("Frontend architecture guidance");
    expect(prompt).toContain("app, pages, widgets, features, entities, shared, lib/api, hooks, store, and styles");
    expect(prompt).toContain("lib/api/<domain>");
  });

  test("explains PRODUCT and DESIGN roles and preservation contract", () => {
    const prompt = buildPrompt(context("build"), "implement", "medium", "Implement", "");

    expect(prompt).toContain("ARCHITECT/PRODUCT.html is the product planning, requirements, behavior, and acceptance-criteria source of truth");
    expect(prompt).toContain("DESIGN/index.html is the visual and interaction design source of truth");
    expect(prompt).toContain("Preserve the PRODUCT and DESIGN direction as much as practical");
    expect(prompt).toContain("For every new or substantially modified source file, include a short top-of-file comment");
  });

  test("injects bootstrap project context when available", () => {
    const root = mkdtempSync(join(tmpdir(), "zeroshot-prompt-"));
    try {
      mkdirSync(join(root, ".agents"), { recursive: true });
      writeFileSync(join(root, ".agents", "PROJECT_CONTEXT.md"), "Runtime: Bun\nLanguage: TypeScript\nFramework: React\n");

      const prompt = buildPrompt(context("build", root), "implement", "medium", "Implement", "");

      expect(prompt).toContain("Bootstrap language and environment context from .agents/PROJECT_CONTEXT.md:");
      expect(prompt).toContain("Runtime: Bun");
      expect(prompt).toContain("Language: TypeScript");
      expect(prompt).toContain("Framework: React");
      expect(prompt).toContain("Treat .agents/PROJECT_CONTEXT.md as the current project language");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("marks resource directories as read-only guidance", () => {
    const ctx = context("build");
    ctx.options.additionalDirectories = ["/tmp/skills", "/tmp/design-templates", "/tmp/design-systems"];

    const prompt = buildPrompt(ctx, "implement", "medium", "Implement", "");

    expect(prompt).toContain("Additional read-only ZeroShot resource roots");
    expect(prompt).toContain("Do not modify files in these resource roots");
  });

  test("includes backend refactoring guidance in update mode", () => {
    const prompt = buildPrompt(context("update"), "implement", "medium", "Implement", "");

    expect(prompt).toContain("Update-mode refactoring guidance");
    expect(prompt).toContain("YAGNI, DRY, single responsibility");
    expect(prompt).toContain("over roughly 500 lines");
    expect(prompt).toContain("Promote functions or data objects to classes only when lifecycle");
  });
});
