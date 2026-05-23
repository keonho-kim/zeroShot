import type { UpdateDecisionResponse } from "@backend/services/update/const/schemas";

export function validateConcreteUpdateDecisions(response: UpdateDecisionResponse): UpdateDecisionResponse {
  for (const decision of response.decisions) {
    if (decision.options.some((option) => option.id === "omakase")) {
      throw new Error("UPDATE decisions must not include Codex self-selection options.");
    }
  }
  return response;
}
