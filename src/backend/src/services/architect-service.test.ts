import { describe, expect, test } from "bun:test";
import { buildArchitectPrompt } from "@backend/prompts/architect/decision-prompt";
import { ensureDevelopmentLanguageDecision, type ArchitectDecisionResponse } from "@backend/services/architect-service";

const baseDecision: ArchitectDecisionResponse["decisions"][number] = {
  id: "workflow",
  title: "Primary workflow",
  prompt: "Which workflow should lead the product?",
  section: "Workflow",
  options: [
    {
      id: "planning",
      label: "Planning",
      detail: "Focus on planning.",
      productRequirement: "The product must make planning the first workflow."
    },
    {
      id: "review",
      label: "Review",
      detail: "Focus on review.",
      productRequirement: "The product must make review the first workflow."
    }
  ]
};

describe("architect service", () => {
  test("adds a development language decision when the brief omits implementation language", () => {
    const response = ensureDevelopmentLanguageDecision({
      title: "Planner",
      summary: "A focused planning product.",
      decisions: [baseDecision]
    }, "작업 계획을 관리하는 앱을 만들고 싶다.", "ko");

    expect(response.decisions[1].id).toBe("development-stack");
    expect(response.decisions[1].prompt).toContain("개발 언어");
    expect(response.decisions).toHaveLength(2);
    expect(response.decisions[1].options[0].productRequirement).toContain("Bootstrap: --type fullstack");
  });

  test("does not add a development language decision when the brief already names a stack", () => {
    const response = ensureDevelopmentLanguageDecision({
      title: "Planner",
      summary: "A focused planning product.",
      decisions: [baseDecision]
    }, "React와 TypeScript로 작업 계획 앱을 만들고 싶다.", "ko");

    expect(response.decisions[0].id).toBe("workflow");
    expect(response.decisions).toHaveLength(1);
  });

  test("passes the bootstrap CLI contract to Codex as final architect context", () => {
    const prompt = buildArchitectPrompt("Build a planning app.", "en", "");

    expect(prompt).toContain("Final bootstrap instruction:");
    expect(prompt).toContain("zeroshot bootstrap");
    expect(prompt).toContain("--type <backend|frontend|fullstack|library|script>");
    expect(prompt).toContain("typescript, javascript, python, go, rust, java, ruby, zig");
  });
});
