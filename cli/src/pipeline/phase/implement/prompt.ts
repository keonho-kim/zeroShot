import type { PipelineContext } from "@cli/pipeline/types.js";

export function createPrompt(ctx: PipelineContext): { goal: string; extra: string } {
  return {
    goal: `- Read the current run documents carefully.
- Pick exactly one top-priority task from PLAN.md > Live Queue.
- Implement only that task unless a tiny directly adjacent fix is required.
- Run only the targeted validation commands for that task plus any obvious mandatory local checks for touched files.
- If the task is fully complete:
  - remove it from PLAN.md > Live Queue
  - append a detailed completion record to DONE.md
  - add a concise note to PLAN.md > Recently Completed
- If the task is not fully complete:
  - keep the remaining work in PLAN.md > Live Queue
  - rewrite the remainder as a smaller, clearer still-pending task
  - record any blocking issue under PLAN.md > Open Issues
- Update SPEC.md, TEST_PLAN.md, and CHANGES.md so they match reality.
- Prefer current run documents as the working truth.
- Do not modify PRODUCT.md in this phase.
- Do not modify UPDATE.md in this phase.
- Return PASS only if this implementation phase safely completed its intended scope.`,
    extra: `Explicitly read current run files:
- ${ctx.productFile}
- ${ctx.runDir}/REQUIREMENTS.md
- ${ctx.runDir}/PLAN.md
- ${ctx.runDir}/SPEC.md
- ${ctx.runDir}/TEST_PLAN.md
- ${ctx.runDir}/DONE.md
- ${ctx.runDir}/CHANGES.md

Use only current run documents as the primary working memory.`
  };
}
