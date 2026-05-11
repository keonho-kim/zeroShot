import type { PipelineContext } from "../../types.js";

export function createPrompt(ctx: PipelineContext): { goal: string; extra: string } {
  return {
    goal: `- Read PRODUCT.md, UPDATE.md, and the current run documents carefully.
- Update PRODUCT.md so it reflects the accepted updated requirements for this run.
- Preserve PRODUCT.md as a coherent product document rather than dumping implementation notes into it.
- Use REQUIREMENTS.md, PLAN.md, SPEC.md, TEST_PLAN.md, DONE.md, and FINAL_REPORT.md as grounding.
- Do not move or delete UPDATE.md in this phase; the shell will handle archival after a PASS result.
- Return PASS only if PRODUCT.md was safely synchronized and remains coherent.
- Return FAIL if synchronization would be unsafe, incomplete, or misleading.`,
    extra: `Explicitly read:
- ${ctx.productFile}
- ${ctx.updateFile}
- ${ctx.runDir}/REQUIREMENTS.md
- ${ctx.runDir}/PLAN.md
- ${ctx.runDir}/SPEC.md
- ${ctx.runDir}/TEST_PLAN.md
- ${ctx.runDir}/DONE.md
- ${ctx.runDir}/CHANGES.md
- ${ctx.runDir}/FINAL_REPORT.md

PRODUCT.md is the file to update in this phase.`
  };
}
