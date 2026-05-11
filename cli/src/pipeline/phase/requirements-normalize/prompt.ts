import type { PipelineContext } from "../../types.js";

export function createPrompt(ctx: PipelineContext): { goal: string; extra: string } {
  if (ctx.mode === "build") {
    return {
      goal: `- Read PRODUCT.md carefully.
- Treat PRODUCT.md as the source truth for intended product direction.
- If PRODUCT.md is brief, expand it into a product-ready requirement set without inventing false certainty.
- Create or update the current run files:
  - REQUIREMENTS.md
  - PLAN.md
  - SPEC.md
  - TEST_PLAN.md
  - DONE.md
  - CHANGES.md
- REQUIREMENTS.md must include user context, core flows, edge cases, non-functional requirements, assumptions, open questions, requirement list, acceptance criteria, and out-of-scope items.
- PLAN.md must contain a prioritized Live Queue that is immediately usable for implementation.
- DONE.md may start empty, but it must exist.
- Do not modify PRODUCT.md in this phase.
- Do not modify production code in this phase.
- Return PASS only if the current run is ready for implementation work.`,
      extra: `Explicitly read:
- ${ctx.productFile}

Then explicitly create or update:
- ${ctx.runDir}/REQUIREMENTS.md
- ${ctx.runDir}/PLAN.md
- ${ctx.runDir}/SPEC.md
- ${ctx.runDir}/TEST_PLAN.md
- ${ctx.runDir}/DONE.md
- ${ctx.runDir}/CHANGES.md`
    };
  }

  return {
    goal: `- Read PRODUCT.md and UPDATE.md carefully.
- Read the previous run documents carefully.
- Treat PRODUCT.md as the base truth and UPDATE.md as the injected change request document.
- Build a fresh current-run requirement set that incorporates the update delta.
- Create or update the current run files:
  - REQUIREMENTS.md
  - PLAN.md
  - SPEC.md
  - TEST_PLAN.md
  - DONE.md
  - CHANGES.md
- REQUIREMENTS.md must contain an explicit "Update Delta Summary" section describing what changed because of UPDATE.md.
- Reuse prior completion history and prior design context when appropriate, but make the current run documents self-sufficient.
- After this phase, the current run documents should be enough to continue implementation without repeatedly depending on the previous run.
- Do not modify PRODUCT.md in this phase.
- Do not modify UPDATE.md in this phase.
- Do not modify production code in this phase.
- Return PASS only if the new current run is ready for implementation work.`,
    extra: `Explicitly read:
- ${ctx.productFile}
- ${ctx.updateFile}
- ${ctx.previousRunDir}/REQUIREMENTS.md
- ${ctx.previousRunDir}/PLAN.md
- ${ctx.previousRunDir}/SPEC.md
- ${ctx.previousRunDir}/TEST_PLAN.md
- ${ctx.previousRunDir}/DONE.md
- ${ctx.previousRunDir}/CHANGES.md
- ${ctx.previousRunDir}/FINAL_REPORT.md

Then explicitly create or update for the NEW current run:
- ${ctx.runDir}/REQUIREMENTS.md
- ${ctx.runDir}/PLAN.md
- ${ctx.runDir}/SPEC.md
- ${ctx.runDir}/TEST_PLAN.md
- ${ctx.runDir}/DONE.md
- ${ctx.runDir}/CHANGES.md`
  };
}
