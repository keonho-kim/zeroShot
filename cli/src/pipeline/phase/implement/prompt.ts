import type { PipelineContext } from "@cli/pipeline/types.js";
import { updateRefactoringGuidanceBlock } from "@cli/pipeline/phase/common/prompt-blocks.js";

export function createPrompt(ctx: PipelineContext): { goal: string; extra: string } {
  const updateRefactoring = ctx.mode === "update"
    ? `\n- If this update touches backend code, analyze whether the touched area should be refactored for domain-level maintainability before or during the behavior change.`
    : "";
  return {
    goal: `- Use the compact pipeline state to choose one top-priority implementation task.
- Implement only that task unless a tiny directly adjacent fix is required.
- Run targeted validation for touched behavior when practical.
- Do not create or update run markdown files.
- Put the completed work details in work_log_entries.
- Return PASS only if this implementation phase safely completed its intended scope.${updateRefactoring}`,
    extra: ctx.mode === "update"
      ? `Use PRODUCT.html, UPDATE.md, .agents/PROJECT_CONTEXT.md when present, and compact state as grounding.

${updateRefactoringGuidanceBlock()}

Record changed_files, validation, next_steps, and open_issues in the JSON response.`
      : "Use PRODUCT.html, .agents/PROJECT_CONTEXT.md when present, and compact state as grounding. Record changed_files, validation, next_steps, and open_issues in the JSON response."
  };
}
