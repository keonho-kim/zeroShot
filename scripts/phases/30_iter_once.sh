#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# scripts/phases/30_iter_once.sh
#
# Live Queue에서 작업 1개만 집어서 구현합니다.
# 완료되면 DONE.md로 옮기고 Live Queue에서 제거합니다.
# 미완이면 남은 일을 더 작은 작업으로 다시 적습니다.
# -----------------------------------------------------------------------------

iter_once() {
  local iter="${1:-1}"

  echo "[iter] 구현 iteration을 시작합니다."
  echo "[iter] iteration 번호: $iter"
  echo "[iter] 목표: PLAN.md의 Live Queue에서 작업 1개만 처리합니다."

  local goal_text
  local extra_context

  goal_text="$(cat <<'EOF'
- Read the current run documents carefully.
- Pick exactly one top-priority task from PLAN.md > Live Queue.
- Implement only that task unless a tiny directly adjacent fix is required.
- Run only the targeted validation commands for that task plus any obvious mandatory local checks for touched files.
- If the task is fully complete:
  - remove it from PLAN.md > Live Queue
  - append a detailed completion record to DONE.md
  - add a concise note to PLAN.md > Recently Completed
- If the task is not fully complete:
  - keep the remaining work in PLAN.md > Live Queue
  - rewrite the remainder as a smaller, clearer still-pending task
  - record any blocking issue under PLAN.md > Open Issues
- Update SPEC.md, TEST_PLAN.md, and CHANGES.md so they match reality.
- Prefer current run documents as the working truth.
- Do not modify PRODUCT.md in this phase.
- Do not modify UPDATE.md in this phase.
- Return PASS only if this implementation phase safely completed its intended scope.
EOF
)"
  extra_context="$(cat <<EOF
Explicitly read current run files:
- $PRODUCT_FILE
- $RUN_DIR/REQUIREMENTS.md
- $RUN_DIR/PLAN.md
- $RUN_DIR/SPEC.md
- $RUN_DIR/TEST_PLAN.md
- $RUN_DIR/DONE.md
- $RUN_DIR/CHANGES.md

Use only current run documents as the primary working memory.
EOF
)"

  run_codex_phase "implement-$iter" "$EXEC_REASONING" "$goal_text" "$extra_context"

  echo "[iter] iteration이 끝났습니다."
  echo "[iter] gate            : $LAST_GATE"
  echo "[iter] selected_task   : ${LAST_SELECTED_TASK:-<none>}"
  echo "[iter] progress_made   : $LAST_PROGRESS_MADE"
  echo "[iter] queue_empty     : $LAST_QUEUE_EMPTY"
  echo "[iter] code_changed    : $LAST_CODE_CHANGED"
  echo "[iter] summary         : $LAST_SUMMARY"
}
