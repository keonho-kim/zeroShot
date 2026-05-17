import { describe, expect, test } from "bun:test";
import { buildBootstrapCommandSpec, buildPipelineCommandSpec } from "@backend/core/cli-command";

describe("cli command specs", () => {
  test("runs bootstrap through the zeroshot executable", () => {
    const spec = buildBootstrapCommandSpec({
      projectRoot: "/tmp/project",
      projectType: "fullstack",
      serverLanguage: "python",
      uiLanguage: "typescript",
      profile: "llm"
    });

    expect(spec.command).toBe(process.env.ZEROSHOT_APP_CLI_ENTRY || "zeroshot");
    expect(spec.args).toEqual([
      "bootstrap",
      "--project-root",
      "/tmp/project",
      "--type",
      "fullstack",
      "--server-language",
      "python",
      "--ui-language",
      "typescript",
      "--profile",
      "llm"
    ]);
  });

  test("passes all resource roots as additional pipeline directories", () => {
    const spec = buildPipelineCommandSpec("build", "/tmp/project", {
      approval: "never",
      sandbox: "workspace-write",
      maxIters: 1,
      stallLimit: 1,
      planReasoning: "high",
      execReasoning: "medium",
      validateReasoning: "medium",
      closeoutReasoning: "medium"
    }, {
      additionalDirectories: ["/tmp/skills", "/tmp/design-templates", "/tmp/design-systems"]
    });

    expect(spec.args).toContain("--add-dir");
    expect(spec.args).toContain("/tmp/skills");
    expect(spec.args).toContain("/tmp/design-templates");
    expect(spec.args).toContain("/tmp/design-systems");
  });
});
