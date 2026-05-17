import { describe, expect, test } from "bun:test";
import { buildBootstrapCommandSpec } from "@backend/core/cli-command";

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
});
