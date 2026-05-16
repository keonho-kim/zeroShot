import type { PipelineContext } from "@cli/pipeline/types.js";
import { updateRefactoringGuidanceBlock } from "@cli/pipeline/phase/common/prompt-blocks.js";

export function createPrompt(ctx: PipelineContext): { goal: string; extra: string } {
  return {
    goal: `- Use the compact pipeline state to make the remaining queue smaller and clearer.
- In update mode, keep backend refactoring tasks only when they directly support the requested update or remove current maintenance risk in touched domains.
- Do not modify production code.
- Do not create or update run markdown files.
- Return PASS only if the next implementation step is clear and executable.`,
    extra: ctx.mode === "update"
      ? `Record the refined queue intent through result_summary, next_steps, and open_issues.

${updateRefactoringGuidanceBlock()}`
      : "Record the refined queue intent through result_summary, next_steps, and open_issues."
  };
}
