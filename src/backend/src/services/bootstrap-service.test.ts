import { describe, expect, test } from "bun:test";
import { inferBootstrapRequest } from "@backend/services/bootstrap-service";

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
});
