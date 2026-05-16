import type { PipelineContext } from "@cli/pipeline/types.js";

export function createPrompt(_ctx: PipelineContext): { goal: string; extra: string } {
  return {
    goal: `- Use the compact pipeline state to choose one top-priority implementation task.
- Implement only that task unless a tiny directly adjacent fix is required.
- Run targeted validation for touched behavior when practical.
- Do not create or update run markdown files.
- Put the completed work details in work_log_entries.
- Return PASS only if this implementation phase safely completed its intended scope.`,
    extra: "Use PRODUCT.html, .agents/PROJECT_CONTEXT.md when present, and compact state as grounding. Record changed_files, validation, next_steps, and open_issues in the JSON response."
  };
}
