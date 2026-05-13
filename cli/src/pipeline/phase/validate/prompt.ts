import type { PipelineContext } from "@cli/pipeline/types.js";

export function createPrompt(ctx: PipelineContext): { goal: string; extra: string } {
  return {
    goal: `- Read the current run documents carefully.
- Run the broader validation commands that now make sense for the repository state.
- Use TEST_PLAN.md and the repository's own scripts as guidance.
- If a directly related low-risk fix is obvious, you may apply it and rerun the affected checks.
- Update PLAN.md, DONE.md, TEST_PLAN.md, SPEC.md, and CHANGES.md so they reflect the actual validated state.
- Do not modify UPDATE.md in this phase.
- Do not modify PRODUCT.md in this phase.
- Return PASS only if validation work completed safely and the current run documents reflect the real state.`,
    extra: `Explicitly read current run files:
- ${ctx.productFile}
- ${ctx.runDir}/REQUIREMENTS.md
- ${ctx.runDir}/PLAN.md
- ${ctx.runDir}/SPEC.md
- ${ctx.runDir}/TEST_PLAN.md
- ${ctx.runDir}/DONE.md
- ${ctx.runDir}/CHANGES.md
- ${ctx.runLogDir}/000-manifest.tsv

Prefer the current run as the working truth.`
  };
}
