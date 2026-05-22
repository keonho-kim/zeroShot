import type { PipelineContext } from "@cli/pipeline/types.js";

export function createPrompt(_ctx: PipelineContext): { goal: string; extra: string } {
  return {
    goal: `- Use the compact pipeline state to decide which validation commands now make sense.
- Run the relevant test code and broader validation commands that are appropriate for the repository state.
- Cross-check implemented behavior against PRODUCT.html feature specifications.
- Record any PRODUCT mismatch, unverified behavior, or skipped test clearly.
- If a directly related low-risk fix is obvious, you may apply it and rerun the affected checks.
- Do not create or update run markdown files.
- Return PASS only if validation completed safely.`,
    extra: "Record validation commands and outcomes in validation and work_log_entries."
  };
}
