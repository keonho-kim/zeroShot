import type { PipelineContext } from "@cli/pipeline/types";
import { updateRefactoringGuidanceBlock } from "@cli/pipeline/phase/common/prompt-blocks";

export function createPrompt(ctx: PipelineContext): { goal: string; extra: string } {
  if (ctx.mode === "build") {
    return {
      goal: `- Read PRODUCT.html carefully.
- If DESIGN/index.html exists, read it as the current interactive canvas and use it as UI implementation guidance.
- Treat PRODUCT.html as the product requirements and behavior contract.
- Treat DESIGN/index.html as the visual and interaction design contract when it exists.
- Preserve PRODUCT and DESIGN direction as much as practical in the implementation queue.
- Interpret the product goal, constraints, likely implementation slices, and validation needs.
- Include relevant test execution and PRODUCT.html feature-spec cross-checks in the implementation queue.
- Create a compact implementation queue in your JSON response, not in workspace markdown files.
- Do not modify PRODUCT.html in this phase.
- Do not modify DESIGN/index.html in this phase.
- Do not modify production code in this phase.
- Return PASS only if the compact state is ready for implementation work.`,
      extra: `Read only as needed:
- ${ctx.productFile} - product requirements and behavior contract
- ${ctx.projectRoot}/DESIGN/index.html - visual and interaction design contract when present

Fill result_summary, next_steps, open_issues, and work_log_entries with concise user-facing content.`
    };
  }

  return {
    goal: `- Read PRODUCT.html and UPDATE.md carefully.
- Treat PRODUCT.html as the product requirements and behavior contract.
- If DESIGN/index.html exists, treat it as the visual and interaction design contract.
- Treat UPDATE.md as the change request.
- Preserve PRODUCT and DESIGN direction as much as practical while applying the update.
- Incorporate the update delta into a compact implementation queue in your JSON response.
- Include backend refactoring needs in the queue when the update touches oversized files, duplicated behavior, unclear utilities, weak domain boundaries, or architecture drift.
- Include relevant test execution and PRODUCT.html feature-spec cross-checks in the implementation queue.
- Do not modify PRODUCT.html in this phase.
- Do not modify UPDATE.md in this phase.
- Do not modify production code in this phase.
- Return PASS only if the compact state is ready for update implementation work.`,
    extra: `Read only as needed:
- ${ctx.productFile} - product requirements and behavior contract
- ${ctx.projectRoot}/DESIGN/index.html - visual and interaction design contract when present
- ${ctx.updateFile} - requested update contract

Use the compact state instead of previous run markdown files.

${updateRefactoringGuidanceBlock()}`
  };
}
