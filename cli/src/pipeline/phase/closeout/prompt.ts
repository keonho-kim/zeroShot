import type { PipelineContext } from "../../types.js";

export function createPrompt(ctx: PipelineContext): { goal: string; extra: string } {
  return {
    goal: `- Read the current run documents carefully.
- Create or update FINAL_REPORT.md.
- FINAL_REPORT.md must summarize:
  - the interpreted product goal
  - completed scope
  - deferred or unfinished scope
  - key code and document changes
  - validations run and results
  - remaining risks
  - recommended next actions
- Ensure PLAN.md does not pretend unfinished work is done.
- Ensure DONE.md contains every completed task that left the Live Queue.
- In update mode, mention whether PRODUCT.md synchronization succeeded.
- Do not invent success.
- Return PASS only if closeout documentation was safely completed.`,
    extra: `Explicitly read current run files:
- ${ctx.productFile}
- ${ctx.runDir}/REQUIREMENTS.md
- ${ctx.runDir}/PLAN.md
- ${ctx.runDir}/SPEC.md
- ${ctx.runDir}/TEST_PLAN.md
- ${ctx.runDir}/DONE.md
- ${ctx.runDir}/CHANGES.md
- ${ctx.runDir}/FINAL_REPORT.md
- ${ctx.runLogDir}/000-manifest.tsv

In update mode, also note:
- UPDATE file path was: ${ctx.updateFile}
- Previous run path was: ${ctx.previousRunDir || "<none>"}`
  };
}
