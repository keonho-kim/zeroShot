import type { PipelineContext } from "../../types.js";

export function createPrompt(ctx: PipelineContext): { goal: string; extra: string } {
  return {
    goal: `- Read the current run documents carefully.
- Do not depend on previous-run files in this phase.
- Refine PLAN.md so Live Queue tasks are smaller, clearer, and more executable.
- If a task is too large, split it into smaller pending tasks.
- If the queue order is suboptimal, reorder it.
- If an issue is blocking implementation, capture it under PLAN.md > Open Issues.
- Reconcile SPEC.md and TEST_PLAN.md with the updated queue if needed.
- Do not modify PRODUCT.md in this phase.
- Do not modify UPDATE.md in this phase.
- Do not modify production code in this phase.
- Return PASS only if the current run plan is again in a healthy executable state.`,
    extra: `Explicitly read current run files:
- ${ctx.runDir}/REQUIREMENTS.md
- ${ctx.runDir}/PLAN.md
- ${ctx.runDir}/SPEC.md
- ${ctx.runDir}/TEST_PLAN.md
- ${ctx.runDir}/DONE.md
- ${ctx.runDir}/CHANGES.md

Do not rely on previous run files unless absolutely necessary.`
  };
}
