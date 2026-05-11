import type { PipelineContext } from "../../types.js";
import { nowHuman } from "../../utils.js";

function currentRunFileBlock(ctx: PipelineContext): string {
  return `Current run files to read if they exist:
- ${ctx.productFile}
- ${ctx.runDir}/REQUIREMENTS.md
- ${ctx.runDir}/PLAN.md
- ${ctx.runDir}/SPEC.md
- ${ctx.runDir}/TEST_PLAN.md
- ${ctx.runDir}/DONE.md
- ${ctx.runDir}/CHANGES.md
- ${ctx.runDir}/FINAL_REPORT.md
- ${ctx.runLogDir}/000-manifest.tsv`;
}

function updateInputFileBlock(ctx: PipelineContext): string {
  if (ctx.mode !== "update") {
    return "";
  }
  return `Update input file to read:
- ${ctx.updateFile}`;
}

function previousRunFileBlock(ctx: PipelineContext): string {
  if (!ctx.previousRunDir) {
    return "";
  }
  return `Previous run files to read only when explicitly needed:
- ${ctx.previousRunDir}/REQUIREMENTS.md
- ${ctx.previousRunDir}/PLAN.md
- ${ctx.previousRunDir}/SPEC.md
- ${ctx.previousRunDir}/TEST_PLAN.md
- ${ctx.previousRunDir}/DONE.md
- ${ctx.previousRunDir}/CHANGES.md
- ${ctx.previousRunDir}/FINAL_REPORT.md
- ${ctx.previousRunDir}/logs/000-manifest.tsv`;
}

function commonContract(): string {
  return `You are running inside Codex CLI in scripted non-interactive mode.
This is a filesystem action task, not an answer-only task.

You must treat the current run directory as the working memory for this run.

Required files you must manage on disk inside the current run:
- REQUIREMENTS.md
- PLAN.md
- SPEC.md
- TEST_PLAN.md
- DONE.md
- CHANGES.md
- FINAL_REPORT.md

Create missing required files yourself.
Do not merely describe documents in the reply.
Actually write and update them on disk.

Document contracts:

1) REQUIREMENTS.md
This file turns PRODUCT.md into a product-ready, development-ready requirement set.
Use this structure:

# REQUIREMENTS
## Product Source Summary
## Interpreted Product Goal
## Users and Context
## Core User Flows
## Edge Cases and Failure Cases
## Non-functional Requirements
## Constraints
## Assumptions
## Open Questions
## Requirement List
## Acceptance Criteria
## Out of Scope
## Update Delta Summary

Rules:
- If PRODUCT.md is brief, responsibly expand it into a product-ready requirement set.
- Clearly separate facts from assumptions.
- Do not invent certainty; record assumptions and open questions explicitly.
- In update mode, compare PRODUCT.md and UPDATE.md against the previous run and summarize the delta.

2) PLAN.md
This is the source of truth for active work.
Use this structure:

# PLAN
## Goals
## Non-goals
## Assumptions
## Requirement Map
## Live Queue
## Open Issues
## Recently Completed

Inside "Live Queue", each task must use this shape:

### T-001 <short title>
- requirement_refs:
  - R-001
- files_hint:
  - src/example/file.ts
- validation:
  - npm test -- foo
- done_when:
  - exact observable outcome
- notes:
  - any useful context

Rules:
- Keep Live Queue ordered by priority.
- Keep tasks small enough to complete in one implementation loop when possible.
- If a task is partially completed, rewrite the remaining work as a smaller still-pending task.
- When a task is fully complete, remove it from Live Queue and move the substantive record to DONE.md.

3) SPEC.md
Use this structure:

# SPEC
## Product intent
## Current codebase findings
## Gap analysis
## Target design
## Implementation slices
## Acceptance criteria
## Risks / assumptions
## Deferred items

4) TEST_PLAN.md
Use this structure:

# TEST_PLAN
## Validation strategy
## Requirement to validation mapping
## Targeted checks per task
## Broader regression checks
## UAT / smoke scenarios
## Known gaps

5) DONE.md
Append-only completion ledger.
When a task is fully complete, move its substantive details out of PLAN.md Live Queue into DONE.md.
Use this entry format:

## <YYYY-MM-DD HH:MM:SS> <TASK_ID> <title>
- requirement_refs:
  - R-001
- summary:
- files_changed:
  - relative/path
- validation_run:
  - command
- result:
- follow_on:

6) CHANGES.md
Append one section per Codex call using this exact heading format:

## <YYYY-MM-DD HH:MM:SS> <PHASE>

And include these bullets:
- Decisions:
- Files changed:
- Commands run:
- Test results:
- Follow-ups:

7) FINAL_REPORT.md
Final closeout summary.
Must reflect the actual end state, not an aspirational state.

Global rules:
- PRODUCT.md is the system truth for intended product direction.
- In update mode, UPDATE.md is the injected change request document.
- The current run documents are the working memory for the current run.
- In update mode, use previous run documents only during requirements normalization or when explicitly asked.
- After requirements normalization, prefer the current run documents as the working truth for implementation.
- Record commands and tests honestly in CHANGES.md.
- Use PASS / FAIL conservatively.
- PASS means the phase safely completed its job.
- FAIL means the phase did not safely complete its job.
- Write user-facing explanations, run reports, and final summaries in the response language configured for this run. Keep code identifiers and required schema keys unchanged.`;
}

export function buildPrompt(ctx: PipelineContext, phase: string, reasoning: string, goalText: string, extraContext: string): string {
  return `Repository root: ${ctx.projectRoot}
Run mode: ${ctx.mode}
Product file: ${ctx.productFile}
Run directory: ${ctx.runDir}
Run logs directory: ${ctx.runLogDir}
Run input directory: ${ctx.runInputDir}
Outputs directory: ${ctx.outputsDir}
Run name: ${ctx.runName}
Current phase: ${phase}
Current time: ${nowHuman()}
Requested reasoning effort: ${reasoning}
Response language: ${ctx.options.responseLanguage}

${currentRunFileBlock(ctx)}

${updateInputFileBlock(ctx)}

${previousRunFileBlock(ctx)}

${commonContract()}

Phase-specific goal:
${goalText}

Additional execution context:
${extraContext}

Pipeline note:
${ctx.pipelineNote || "none"}

Final response requirements:
- Return only a JSON object matching the provided output schema.
- Use repo-relative paths in created_files and updated_files.
- Use exact commands actually executed in commands_run and tests_run.
- gate must be either PASS or FAIL.
- progress_made should be true only when this phase produced meaningful forward progress in docs, code, or verified completion state.
- queue_empty should be true only when PLAN.md Live Queue is empty at the end of the phase.
- code_changed should be true only when repository files under active development were actually changed in this phase.
- product_sync_safe should be true only when PRODUCT.md is now in a safe synchronized state for this run.
- selected_task should be the active task id for implementation phases, otherwise an empty string.
`;
}
