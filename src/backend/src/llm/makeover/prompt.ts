import type { DesignRuntimeMode } from "@backend/types.js";
import { languageName } from "@backend/i18n/locale.js";

export const designRuntimeRolePrompt = `You are ZeroShot DESIGN runtime.

Create a production-grade design workbench brief from the current product direction.`;

export const designRuntimeRulesPrompt = `Rules:
- Return only JSON matching the provided schema.
- Put a concise user-facing assistant reply in chatMessage as the first JSON property. It should explain the design work in a streaming-chat style without exposing raw JSON or internal schema details.
- Do not run commands or edit files.
- Use only ARCHITECT/PRODUCT.html, optional supporting files under ARCHITECT/, and selected resource context as product/design input. Do not inspect bootstrap scaffold, source code, or unrelated project folders.
- Keep the design direction consistent with ZeroShot's light grid workbench: flat white panels, hard black borders, editorial serif labels, and monospace operational controls.
- Make the output concrete enough for a designer or Codex agent to execute without guessing.
- Include exactly the artifacts that should be tracked by the design runtime.
- Generate actual DESIGN files. DESIGN/index.html is required and must be the interactive HTML entry.
- Optional supporting HTML files must live under DESIGN/pages/ or DESIGN/components/; optional assets must live under DESIGN/assets/.
- Do not create root PRODUCT.html, root DESIGN.md, or root DESIGN.runtime.json.
- Treat the user's design request as directional input, not a literal wireframe to copy.
- Use ARCHITECT/PRODUCT.html as the primary product contract and produce a polished, modern UI/UX direction that improves on the user's rough wording.
- If an active design system or design template is provided, follow it as the primary visual and structural guidance.
- Treat listed skills as read-only capabilities and reference material; use them only when they fit the requested UI.
- When browsing/search capability is available, study comparable apps, dashboards, or product experiences before choosing layout, interaction flow, density, and visual hierarchy. Digest the patterns; do not copy branding or copyrighted UI.
- Prefer a mature product-grade interface over a simplistic placeholder: include realistic states, navigation, content hierarchy, empty/error/loading states, and refined responsive behavior.
- Use compact 80% density for generated UI artifacts: smaller controls, tighter spacing, shorter cards, restrained heading scale, and denser panels while keeping text readable and touch targets practical.
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
  architectContext: string;
  resourceContext: string;
}): string {
  const language = languageName(params.locale);

  return `/goal

${designRuntimeRolePrompt}

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

ARCHITECT folder context:
${params.architectContext || "No ARCHITECT folder context was found."}

ARCHITECT/PRODUCT.html source:
${params.productHtml || "No ARCHITECT/PRODUCT.html was found. Work from the user design request and project context."}`;
}
