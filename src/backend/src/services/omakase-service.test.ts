import { describe, expect, test } from "bun:test";
import { omakaseStages, selectOmakaseDesignResources, selectRecommendedArchitectAnswers } from "@backend/services/omakase-service";
import type { ArchitectDecisionResponse } from "@backend/services/architect-service";
import type { DesignRecommendationResponse } from "@backend/types";

describe("omakase service", () => {
  test("uses the ARCHITECT, DESIGN, BUILD stage order", () => {
    expect(omakaseStages).toEqual(["architect", "design", "build"]);
  });

  test("auto-selects the first architect option for every decision", () => {
    const decisions: ArchitectDecisionResponse["decisions"] = [
      {
        id: "audience",
        title: "Audience",
        prompt: "Choose the audience.",
        section: "Product",
        options: [
          { id: "founders", label: "Founders", detail: "Founder workflow.", productRequirement: "Build for founders." },
          { id: "teams", label: "Teams", detail: "Team workflow.", productRequirement: "Build for teams." }
        ]
      },
      {
        id: "stack",
        title: "Stack",
        prompt: "Choose the stack.",
        section: "Implementation",
        options: [
          { id: "react", label: "React", detail: "React app.", productRequirement: "Use React." },
          { id: "vue", label: "Vue", detail: "Vue app.", productRequirement: "Use Vue." }
        ]
      }
    ];

    expect(selectRecommendedArchitectAnswers(decisions)).toEqual({
      audience: "founders",
      stack: "react"
    });
  });

  test("auto-selects the first recommended design system and template", () => {
    const recommendations: DesignRecommendationResponse = {
      chatMessage: "Recommended resources.",
      title: "Design direction",
      summary: "Use the first resources.",
      designSystems: [
        { id: "system-1", resourceId: "arcade-system", label: "Arcade", detail: "Pixel system.", reason: "Best fit." },
        { id: "system-2", resourceId: "calm-system", label: "Calm", detail: "Calm system.", reason: "Fallback." }
      ],
      designTemplates: [
        { id: "template-1", resourceId: "workbench-template", label: "Workbench", detail: "Workbench flow.", reason: "Best fit." },
        { id: "template-2", resourceId: "landing-template", label: "Landing", detail: "Landing flow.", reason: "Fallback." }
      ]
    };

    expect(selectOmakaseDesignResources(recommendations)).toEqual({
      activeDesignSystemId: "arcade-system",
      activeDesignTemplateId: "workbench-template"
    });
  });
});
