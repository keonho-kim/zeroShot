#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# scripts/lib/50_contract.sh
#
# Codex에게 전달할 공통 문서 규약과 prompt 파일 생성 로직을 담당합니다.
# 모든 phase 프롬프트는 "경로 명시형"으로 작성됩니다.
# -----------------------------------------------------------------------------

current_run_file_block() {
  cat <<EOF
Current run files to read if they exist:
- $PRODUCT_FILE
- $RUN_DIR/REQUIREMENTS.md
- $RUN_DIR/PLAN.md
- $RUN_DIR/SPEC.md
- $RUN_DIR/TEST_PLAN.md
- $RUN_DIR/DONE.md
- $RUN_DIR/CHANGES.md
- $RUN_DIR/FINAL_REPORT.md
- $RUN_LOG_DIR/000-manifest.tsv
EOF
}

update_input_file_block() {
  if [[ "$RUN_MODE" == "update" ]]; then
    cat <<EOF
Update input file to read:
- $UPDATE_FILE
EOF
  fi
}

previous_run_file_block() {
  if [[ -n "${PREVIOUS_RUN_DIR:-}" ]]; then
    cat <<EOF
Previous run files to read only when explicitly needed:
- $PREVIOUS_RUN_DIR/REQUIREMENTS.md
- $PREVIOUS_RUN_DIR/PLAN.md
- $PREVIOUS_RUN_DIR/SPEC.md
- $PREVIOUS_RUN_DIR/TEST_PLAN.md
- $PREVIOUS_RUN_DIR/DONE.md
- $PREVIOUS_RUN_DIR/CHANGES.md
- $PREVIOUS_RUN_DIR/FINAL_REPORT.md
- $PREVIOUS_RUN_DIR/logs/000-manifest.tsv
EOF
  fi
}

common_contract() {
  cat <<'EOF'
You are running inside Codex CLI in scripted non-interactive mode.
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
EOF
}

write_prompt_file() {
  local phase="$1"
  local reasoning="$2"
  local goal_text="$3"
  local extra_context="$4"
  local out_file="$5"

  log "[contract] Codex prompt 파일을 생성합니다. phase=$phase out=$out_file"

  cat > "$out_file" <<EOF
Repository root: $ROOT
Run mode: $RUN_MODE
Product file: $PRODUCT_FILE
Run directory: $RUN_DIR
Run logs directory: $RUN_LOG_DIR
Run input directory: $RUN_INPUT_DIR
Outputs directory: $OUTPUTS_DIR
Run name: $RUN_NAME
Current phase: $phase
Current time: $(now_human)
Requested reasoning effort: $reasoning

$(current_run_file_block)

$(update_input_file_block)

$(previous_run_file_block)

$(common_contract)

Phase-specific goal:
$goal_text

Additional execution context:
$extra_context

Pipeline note:
${PIPELINE_NOTE:-none}

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
EOF
}
