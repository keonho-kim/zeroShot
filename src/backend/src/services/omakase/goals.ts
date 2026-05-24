import type { DesignRecommendationResponse } from "@backend/types/design";

export function omakaseArchitectGoal(brief: string): string {
  return [
    brief.trim(),
    "",
    "OMAKASE MODE is enabled.",
    "Proceed with the optimal judgment yourself. Do not ask the user to choose between options.",
    "For every decision, put the option you judge best as the first option so ZeroShot can automatically select it.",
    "Choose a coherent path that can proceed through ARCHITECT, DESIGN, and BUILD."
  ].join("\n");
}

export function omakaseDesignGoal(brief: string, recommendations: DesignRecommendationResponse): string {
  const designSystem = recommendations.designSystems[0]?.label ?? "the recommended design system";
  const designTemplate = recommendations.designTemplates[0]?.label ?? "the recommended design template";
  return [
    brief.trim(),
    "",
    "OMAKASE MODE is enabled.",
    "Use the product blueprint and make the optimal design judgment yourself.",
    `Use the recommended design system: ${designSystem}.`,
    `Use the recommended design template: ${designTemplate}.`,
    "Create a concrete design handoff that is ready for BUILD."
  ].join("\n");
}
