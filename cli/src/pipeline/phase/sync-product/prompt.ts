import type { PipelineContext } from "@cli/pipeline/types";

export function createPrompt(ctx: PipelineContext): { goal: string; extra: string } {
  return {
    goal: `- Read PRODUCT.html and UPDATE.md carefully.
- Update PRODUCT.html so it reflects the accepted update result.
- Preserve PRODUCT.html as a coherent product blueprint.
- Do not move or delete UPDATE.md.
- Do not create or update run markdown files.
- Return PASS only if PRODUCT.html was safely synchronized and remains coherent.`,
    extra: `Files:
- ${ctx.productFile}
- ${ctx.updateFile}

Use compact state as grounding for what changed.`
  };
}
