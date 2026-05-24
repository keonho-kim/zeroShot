import type { ArchitectDecisionResponse } from "@backend/services/architect/service";
import type { DesignRecommendationResponse } from "@backend/types/design";

export function selectRecommendedArchitectAnswers(decisions: ArchitectDecisionResponse["decisions"]): Record<string, string> {
  return Object.fromEntries(decisions.map((decision) => [decision.id, decision.options[0]?.id ?? ""]));
}

export function selectOmakaseDesignResources(recommendations: DesignRecommendationResponse) {
  return {
    activeDesignSystemId: recommendations.designSystems[0]?.resourceId,
    activeDesignTemplateId: recommendations.designTemplates[0]?.resourceId
  };
}
