import { describe, expect, test } from "bun:test";
import { inferBootstrapRequest, runBootstrap } from "@backend/services/bootstrap/service";

describe("bootstrap service", () => {
  test("uses explicit bootstrap contract arguments from architect selections", () => {
    const request = inferBootstrapRequest({
      projectRoot: "/tmp/agent-dashboard",
      answers: { stack: "python-agent" },
      decisions: [{
        id: "stack",
        title: "Development stack",
        prompt: "Choose the stack.",
        section: "Development overview",
        options: [{
          id: "python-agent",
          label: "Python agents + React",
          detail: "Use Python for the server and React for the UI.",
          productRequirement: "Bootstrap: --type fullstack --server-language python --ui-language typescript --profile llm."
        }]
      }]
    });

    expect(request.projectType).toBe("fullstack");
    expect(request.serverLanguage).toBe("python");
    expect(request.uiLanguage).toBe("typescript");
    expect(request.profile).toBe("llm");
    expect(request.name).toBe("agent-dashboard");
  });

  test("runs explicit bootstrap command specs through an injectable runner", async () => {
    const seen: Array<{ command: string; args: string[]; cwd: string | undefined }> = [];
    const result = await runBootstrap({
      projectRoot: "/tmp/agent-dashboard",
      projectType: "fullstack",
      serverLanguage: "python",
      uiLanguage: "typescript",
      profile: "llm"
    }, async (spec) => {
      seen.push({ command: spec.command, args: spec.args, cwd: spec.cwd });
      return { stdout: "ok", stderr: "" };
    });

    expect(seen).toEqual([{
      command: process.env.ZEROSHOT_APP_CLI_ENTRY || "zeroshot",
      cwd: "/tmp/agent-dashboard",
      args: [
        "bootstrap",
        "--project-root",
        "/tmp/agent-dashboard",
        "--type",
        "fullstack",
        "--server-language",
        "python",
        "--ui-language",
        "typescript",
        "--profile",
        "llm"
      ]
    }]);
    expect(result.stdout).toBe("ok");
  });

  test("keeps bootstrap failures explicit", async () => {
    await expect(runBootstrap({
      projectRoot: "/tmp/agent-dashboard",
      projectType: "backend",
      language: "zig"
    }, async () => {
      throw new Error("zig was not found in PATH");
    })).rejects.toThrow("zig was not found in PATH");
  });
});
