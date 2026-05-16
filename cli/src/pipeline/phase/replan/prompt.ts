import type { PipelineContext } from "@cli/pipeline/types.js";

export function createPrompt(_ctx: PipelineContext): { goal: string; extra: string } {
  return {
    goal: `- Use the compact pipeline state to make the remaining queue smaller and clearer.
- Do not modify production code.
- Do not create or update run markdown files.
- Return PASS only if the next implementation step is clear and executable.`,
    extra: "Record the refined queue intent through result_summary, next_steps, and open_issues."
  };
}
