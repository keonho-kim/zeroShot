import type { PipelineContext } from "@cli/pipeline/types.js";
import { updateRefactoringGuidanceBlock } from "@cli/pipeline/phase/common/prompt-blocks.js";

export function createPrompt(ctx: PipelineContext): { goal: string; extra: string } {
  if (ctx.mode === "build") {
    return {
      goal: `- Read PRODUCT.html carefully.
- Interpret the product goal, constraints, likely implementation slices, and validation needs.
- Create a compact implementation queue in your JSON response, not in workspace markdown files.
- Do not modify PRODUCT.html in this phase.
- Do not modify production code in this phase.
- Return PASS only if the compact state is ready for implementation work.`,
      extra: `Read only as needed:
- ${ctx.productFile}

Fill result_summary, next_steps, open_issues, and work_log_entries with concise user-facing content.`
    };
  }

  return {
    goal: `- Read PRODUCT.html and UPDATE.md carefully.
- Treat PRODUCT.html as the base truth and UPDATE.md as the change request.
- Incorporate the update delta into a compact implementation queue in your JSON response.
- Include backend refactoring needs in the queue when the update touches oversized files, duplicated behavior, unclear utilities, weak domain boundaries, or architecture drift.
- Do not modify PRODUCT.html in this phase.
- Do not modify UPDATE.md in this phase.
- Do not modify production code in this phase.
- Return PASS only if the compact state is ready for update implementation work.`,
    extra: `Read only as needed:
- ${ctx.productFile}
- ${ctx.updateFile}

Use the compact state instead of previous run markdown files.

${updateRefactoringGuidanceBlock()}`
  };
}
