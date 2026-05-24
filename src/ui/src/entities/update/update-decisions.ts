import type { UpdateDecision, UpdateDecisionResponse } from "@/types/api";

export function selectedUpdateOption(answers: Record<string, string>, decision: UpdateDecision) {
  return decision.options.find((option) => option.id === answers[decision.id]) ?? null;
}

export function allUpdateDecisionsAnswered(decisions: UpdateDecision[], answers: Record<string, string>): boolean {
  return decisions.every((decision) => Boolean(answers[decision.id]));
}

export function composeUpdateContent(params: {
  request: string;
  decisionSet: UpdateDecisionResponse;
  answers: Record<string, string>;
}): string {
  const selectedRequirements = params.decisionSet.decisions.map((decision) => {
    const selected = selectedUpdateOption(params.answers, decision) ?? decision.options[0];
    return [
      `Question: ${decision.title}`,
      `Selected: ${selected.label}`,
      `Requirement: ${selected.productRequirement}`
    ].join("\n");
  }).join("\n\n");

  return [
    "# UPDATE Request",
    "",
    params.request.trim(),
    "",
    "## Selected Update Decisions",
    "",
    selectedRequirements,
    "",
    "## Completion Requirements",
    "",
    "- Run the relevant test code before finishing the update.",
    "- Cross-check the implemented behavior against PRODUCT.html feature specifications.",
    "- Record any unverified behavior or PRODUCT mismatch clearly in the final work log."
  ].join("\n");
}

export function formatSourceBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 102.4) / 10} KB`;
  }
  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`;
}

export function updateProjectName(projectRoot: string): string {
  return projectRoot.split("/").filter(Boolean).at(-1) || projectRoot;
}
