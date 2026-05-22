import { describe, expect, test } from "bun:test";
import { buildArchitectPrompt } from "@backend/llm/architect/prompt";
import { buildArchitectProductHtmlPrompt } from "@backend/llm/architect/product-html-prompt";
import { ensureDevelopmentLanguageDecision, extractArchitectChatMessage, type ArchitectDecisionResponse } from "@backend/services/architect-service";
import { visiblePreludePrompt } from "@backend/services/codex-visible-stream-service";

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
      chatMessage: "제품 방향을 정리했습니다.",
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
      chatMessage: "제품 방향을 정리했습니다.",
      title: "Planner",
      summary: "A focused planning product.",
      decisions: [baseDecision]
    }, "React와 TypeScript로 작업 계획 앱을 만들고 싶다.", "ko");

    expect(response.decisions[0].id).toBe("workflow");
    expect(response.decisions).toHaveLength(1);
  });

  test("passes the bootstrap CLI contract to Codex as final architect context", () => {
    const prompt = buildArchitectPrompt("Build a planning app.", "en", "");

    expect(prompt.startsWith("/goal")).toBe(false);
    expect(prompt).toContain("Final bootstrap instruction:");
    expect(prompt).toContain("chatMessage");
    expect(prompt).toContain("completely empty project");
    expect(prompt).toContain("no existing product files, source files, README files, or package metadata");
    expect(prompt).toContain("Actively use web search and web page reading");
    expect(prompt).toContain("compare existing apps or programs");
    expect(prompt).toContain("zeroshot bootstrap");
    expect(prompt).toContain("--type <backend|frontend|fullstack|library|script>");
    expect(prompt).toContain("typescript, javascript, python, go, rust, java, ruby, zig");
  });

  test("can override visible prelude tool guidance for empty architect projects", () => {
    const prompt = visiblePreludePrompt({
      locale: "en",
      workflow: "ARCHITECT brief review",
      toolGuidance: "Do not inspect local workspace files, browse local directories, or run local file/search commands such as pwd, ls, find, rg, cat, sed, head, or tree. Use web search when external product-planning context helps.",
      reviewGuidance: "Describe the user brief or external product references. Do not mention local files.",
      task: "Review the user's product brief."
    });

    expect(prompt).toContain("Do not inspect local workspace files");
    expect(prompt).toContain("Use web search");
    expect(prompt).not.toContain("inspect workspace files, product/design documents, source structure");
  });

  test("asks PRODUCT.html generation to stream a user-facing chat message", () => {
    const prompt = buildArchitectProductHtmlPrompt({
      userBrief: "Build a planning app.",
      decisionSet: {
        chatMessage: "제품 방향을 정리했습니다.",
        title: "Planner",
        summary: "A focused planning product.",
        decisions: [baseDecision]
      },
      answers: { workflow: "planning" },
      locale: "en"
    });

    expect(prompt.startsWith("/goal")).toBe(true);
    expect(prompt).toContain("Put chatMessage first");
    expect(prompt).toContain("then files");
    expect(prompt).toContain("ARCHITECT/PRODUCT.html is required");
    expect(prompt).toContain("ARCHITECT/pages/");
    expect(prompt).toContain("ARCHITECT/components/");
    expect(prompt).toContain("ARCHITECT/assets/");
  });

  test("extracts partial architect chat messages from runtime JSON", () => {
    expect(extractArchitectChatMessage('{"chatMessage":"제품 선택지를 정리하고 있습니다.')).toBe("제품 선택지를 정리하고 있습니다.");
    expect(extractArchitectChatMessage('{"title":"Planner"}')).toBe("");
  });
});
