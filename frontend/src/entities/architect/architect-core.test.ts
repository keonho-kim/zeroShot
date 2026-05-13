import { describe, expect, test } from "bun:test";
import {
  allDecisionsAnswered,
  blueprintToProductMarkdown,
  buildBlueprintHtml,
  detectLocale,
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

  test("requires every Codex decision before creating PRODUCT.html", () => {
    expect(allDecisionsAnswered(decisionSet.decisions, { workflow: "production" })).toBe(false);
    expect(allDecisionsAnswered(decisionSet.decisions, { workflow: "production", audience: "owner" })).toBe(true);
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

    expect(html).toContain("width:min(100%,430px)");
    expect(html).toContain("The first screen must prioritize daily production targets");
    expect(html).toContain("application/json");
    expect(html).toContain("/tmp/project");
    expect(html).toContain("Design template: Dashboard");
    expect(blueprintToProductMarkdown(html)).toContain("Use PRODUCT.html as the canonical interactive blueprint");
  });
});
