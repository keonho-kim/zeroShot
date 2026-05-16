import type { DesignRuntimeMode } from "@backend/types.js";

export const designRuntimeRolePrompt = `You are ZeroShot DESIGN runtime.

Create a production-grade design workbench brief from the current product direction.`;

export const designRuntimeRulesPrompt = `Rules:
- Return only JSON matching the provided schema.
- Do not run commands or edit files.
- Keep the design direction consistent with ZeroShot's light grid workbench: flat white panels, hard black borders, editorial serif labels, and monospace operational controls.
- Make the output concrete enough for a designer or Codex agent to execute without guessing.
- Include exactly the artifacts that should be tracked by the design runtime.
- Include wireframe or presentation editing details when the mode requests them, but do not pretend external files were created.
- When recommending HTML artifact edits, require stable data-od-id attributes on major editable elements, data-od-edit="text|link|image|container" where clear, and human-readable data-od-label values.
- Preserve data-od-id attributes during any proposed source changes so the DESIGN editor can patch selected elements deterministically.`;

export const codexCanvasModePrompt = `The output must feel like a Codex generation session: concrete files to create or improve, HTML/CSS interaction requirements, and verification steps.`;

export const wireframeModePrompt = `The output must support a wireframe editing session: layouts, component states, constraints, layer naming, prototype notes, and handoff checks.`;

export const presentationModePrompt = `The output must support a presentation editing session: slide sequence, editorial hierarchy, chart/table placeholders, speaker flow, and export checks.`;

export function modeInstruction(mode: DesignRuntimeMode): string {
  if (mode === "figma") {
    return wireframeModePrompt;
  }
  if (mode === "powerpoint") {
    return presentationModePrompt;
  }
  return codexCanvasModePrompt;
}

export function modeDisplayName(mode: DesignRuntimeMode): string {
  if (mode === "figma") {
    return "Wireframe";
  }
  if (mode === "powerpoint") {
    return "Presentation";
  }
  return "Codex Canvas";
}

export function buildDesignPrompt(params: {
  mode: DesignRuntimeMode;
  goal: string;
  locale: string;
  productHtml: string;
  resourceContext: string;
}): string {
  const language = params.locale === "ko" ? "Korean" : "English";

  return `${designRuntimeRolePrompt}

${designRuntimeRulesPrompt}
- Use ${language} for all user-facing text.

Runtime mode:
${params.mode}

Mode instruction:
${modeInstruction(params.mode)}

User design request:
${params.goal || "Continue from the current product blueprint."}

Active resource context:
${params.resourceContext || "none"}

PRODUCT.html source:
${params.productHtml || "No PRODUCT.html was found. Work from the user design request and project context."}`;
}
