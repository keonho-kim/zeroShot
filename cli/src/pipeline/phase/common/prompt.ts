import type { PipelineContext } from "@cli/pipeline/types.js";
import { nowHuman } from "@cli/pipeline/utils.js";

function updateInputFileBlock(ctx: PipelineContext): string {
  if (ctx.mode !== "update") {
    return "";
  }
  return `Update input file to read:
- ${ctx.updateFile}`;
}

function additionalDirectoryBlock(ctx: PipelineContext): string {
  if (!ctx.options.additionalDirectories.length) {
    return "";
  }
  return `Additional read roots available to this run:
${ctx.options.additionalDirectories.map((directory) => `- ${directory}`).join("\n")}`;
}

function compactStateBlock(ctx: PipelineContext): string {
  return `Current compact pipeline state:
${JSON.stringify(ctx.compactState, null, 2)}`;
}

function commonContract(): string {
  return `You are running inside Codex CLI in scripted non-interactive mode.
This is a filesystem action task, not an answer-only task.

Workspace output contract:
- Do not create .work.history.
- Do not create or update PLAN.md, DONE.md, REQUIREMENTS.md, SPEC.md, TEST_PLAN.md, CHANGES.md, or FINAL_REPORT.md.
- The runner will create only user-facing HTML reports under runs/<run-name>/.
- Store implementation progress only in the final JSON response fields.

Working memory contract:
- PRODUCT.html is the source truth for intended product direction.
- UPDATE.md is the change request in update mode.
- Use the compact pipeline state above instead of markdown run documents.
- Keep summaries short and concrete.
- Do not generate HTML. The runner renders fixed templates.

Final JSON requirements:
- work_log_entries should contain only user-useful work items.
- changed_files should list repo-relative paths that changed.
- validation should list commands/checks and outcomes.
- next_steps should list useful remaining actions.
- open_issues should list real blockers or risks only.
- queue_empty should be true only when no implementation work remains.
- code_changed should be true only when repository files under active development changed.
- product_sync_safe should be true only when PRODUCT.html is safe and coherent after update sync.
- Write user-facing summaries in the response language configured for this run.`;
}

export function buildPrompt(ctx: PipelineContext, phase: string, reasoning: string, goalText: string, extraContext: string): string {
  return `Repository root: ${ctx.projectRoot}
Run mode: ${ctx.mode}
Product file: ${ctx.productFile}
Run directory for final user HTML only: ${ctx.runDir}
Run name: ${ctx.runName}
Current phase: ${phase}
Current time: ${nowHuman()}
Requested reasoning effort: ${reasoning}
Response language: ${ctx.options.responseLanguage}

Read if needed:
- ${ctx.productFile}
- ${ctx.projectRoot}/.agents/PROJECT_CONTEXT.md

${updateInputFileBlock(ctx)}

${additionalDirectoryBlock(ctx)}

${compactStateBlock(ctx)}

${commonContract()}

Phase-specific goal:
${goalText}

Additional execution context:
${extraContext}

Pipeline note:
${ctx.pipelineNote || "none"}

Return only a JSON object matching the provided output schema.`;
}
