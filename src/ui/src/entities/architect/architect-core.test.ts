import { describe, expect, test } from "bun:test";
import {
  allDecisionsAnswered,
  buildBlueprintHtml,
  detectLocale,
  firstRoundEndIndex,
  isDecisionAnswered,
  selectedOption,
  type ArchitectDecisionSet
} from "@/entities/architect/architect-core";

const decisionSet: ArchitectDecisionSet = {
  title: "Bakery planner",
  summary: "Codex converted the brief into product decisions.",
  decisions: [
    {
      id: "workflow",
      title: "Primary workflow",
      prompt: "Which workflow should lead the first version?",
      section: "Workflow",
      options: [
        {
          id: "production",
          label: "Production planning",
          detail: "Plan today's bake quantities first.",
          productRequirement: "The first screen must prioritize daily production targets and completion status."
        },
        {
          id: "orders",
          label: "Preorder intake",
          detail: "Capture reservations first.",
          productRequirement: "The first screen must prioritize preorder entry and pickup windows."
        }
      ]
    },
    {
      id: "audience",
      title: "Operator level",
      prompt: "Who operates the app?",
      section: "Audience",
      options: [
        {
          id: "owner",
          label: "Owner",
          detail: "A business owner uses it between service tasks.",
          productRequirement: "Controls must be concise and optimized for a busy owner."
        },
        {
          id: "staff",
          label: "Staff",
          detail: "Staff members update shared work.",
          productRequirement: "The UI must make assigned tasks and handoffs visible."
        }
      ]
    }
  ]
};

describe("architect core", () => {
  test("detects Korean environment language", () => {
    expect(detectLocale("ko-KR")).toBe("ko");
    expect(detectLocale("en-US")).toBe("en");
  });

  test("tracks selected Codex decision options", () => {
    const [decision] = decisionSet.decisions;
    expect(isDecisionAnswered({}, decision)).toBe(false);
    expect(selectedOption({ workflow: "production" }, decision)?.label).toBe("Production planning");
    expect(isDecisionAnswered({ workflow: "production" }, decision)).toBe(true);
  });

  test("resolves omakase answers to the recommended first option", () => {
    const [decision] = decisionSet.decisions;
    expect(selectedOption({ workflow: "omakase" }, decision)?.id).toBe("production");
    expect(isDecisionAnswered({ workflow: "omakase" }, decision)).toBe(true);
  });

  test("requires every Codex decision before creating PRODUCT.html", () => {
    expect(allDecisionsAnswered(decisionSet.decisions, { workflow: "production" })).toBe(false);
    expect(allDecisionsAnswered(decisionSet.decisions, { workflow: "production", audience: "owner" })).toBe(true);
  });

  test("finds the first round boundary at the development stack question", () => {
    expect(firstRoundEndIndex([
      decisionSet.decisions[0],
      {
        id: "development-stack",
        title: "Development language and stack",
        prompt: "Choose the stack.",
        section: "Development overview",
        options: decisionSet.decisions[0].options
      },
      decisionSet.decisions[1]
    ])).toBe(1);
  });

  test("builds mobile-first PRODUCT.html from selected JSON decisions", () => {
    const html = buildBlueprintHtml({
      locale: "en",
      decisionSet,
      answers: { workflow: "production", audience: "owner" },
      projectRoot: "/tmp/project",
      userBrief: "A bakery needs a daily planning app.",
      resources: {
        skillName: "Web App",
        designTemplateName: "Dashboard"
      }
    });

    expect(html).toContain("width:min(100%,390px)");
    expect(html).toContain("The first screen must prioritize daily production targets");
    expect(html).toContain("application/json");
    expect(html).toContain("/tmp/project");
    expect(html).toContain("Design template: Dashboard");
  });
});
