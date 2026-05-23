import type { ArchitectDecisionResponse } from "@backend/services/architect-service";

function selectedRequirements(decisionSet: ArchitectDecisionResponse, answers: Record<string, string>): string {
  return decisionSet.decisions.map((decision) => {
    const answerId = answers[decision.id];
    const selected = decision.options.find((option) => option.id === answerId) ?? decision.options[0];
    return [
      `Question: ${decision.title}`,
      `Selected: ${selected?.label ?? "Not selected"}`,
      `Requirement: ${selected?.productRequirement ?? selected?.detail ?? ""}`
    ].join("\n");
  }).join("\n\n");
}

export function buildArchitectProductHtmlPrompt(params: {
  userBrief: string;
  decisionSet: ArchitectDecisionResponse;
  answers: Record<string, string>;
  locale: string;
  resourceContext?: string;
}): string {
  return [
    "/goal",
    "Create the ARCHITECT product blueprint files for this ZeroShot project.",
    "",
    "Return only JSON matching the schema. Put chatMessage first, then files.",
    "chatMessage must be a concise user-facing status update in the requested locale that explains what you are preparing.",
    "The files field must contain one or more coordinated interactive HTML artifact files.",
    "ARCHITECT/PRODUCT.html is required and must be the main interactive HTML entry.",
    "Optional supporting files must live under ARCHITECT/pages/, ARCHITECT/components/, or ARCHITECT/assets/.",
    "Do not create files or run commands. Do not return Markdown.",
    "The ARCHITECT files must be product planning documents, not implementation code. They should be useful later for DESIGN, BUILD, and UPDATE.",
    "Use self-contained CSS and lightweight JavaScript only when it improves interactive review.",
    "Use compact 80% density in the generated planning document: smaller controls, tighter section spacing, shorter cards, and restrained heading scale while keeping the document readable.",
    "Include product concept, target users, key workflows, core screens, data model, integrations, build constraints, and acceptance criteria.",
    "Write user-facing content in the requested locale.",
    "",
    `Locale: ${params.locale}`,
    "",
    "Initial user brief:",
    params.userBrief,
    "",
    "Selected architect decisions:",
    selectedRequirements(params.decisionSet, params.answers),
    "",
    params.resourceContext ? ["Active resources:", params.resourceContext].join("\n") : ""
  ].filter(Boolean).join("\n");
}
