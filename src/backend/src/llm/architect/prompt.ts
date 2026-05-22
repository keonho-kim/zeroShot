import { bootstrapCliContractPrompt } from "@backend/llm/architect/bootstrap-contract.js";
import { architectDecisionRulesPrompt, architectRolePrompt } from "@backend/llm/architect/rules.js";
import { languageName } from "@backend/i18n/locale.js";

export { bootstrapCliContractPrompt } from "@backend/llm/architect/bootstrap-contract.js";
export { architectDecisionRulesPrompt, architectRolePrompt } from "@backend/llm/architect/rules.js";

export function buildArchitectPrompt(goal: string, locale: string, resourceContext: string): string {
  const language = languageName(locale);

  return `${architectRolePrompt}

${architectDecisionRulesPrompt}
- Use ${language} for all user-facing text.
- Return JSON with chatMessage as the first field. chatMessage must be a concise user-facing progress/summary sentence that can be streamed while ARCHITECT is working.

Active resource context:
${resourceContext || "none"}

User conversation:
${goal}

Final bootstrap instruction:
${bootstrapCliContractPrompt}`;
}
