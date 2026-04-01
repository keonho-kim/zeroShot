#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# scripts/phases/20_replan.sh
#
# FAIL 또는 stall 상황에서 PLAN.md의 Live Queue를 더 작고 실행 가능한 작업으로
# 재구성합니다. 이전 run 문서는 다시 읽지 않고 current run만 기준으로 정리합니다.
# -----------------------------------------------------------------------------

replan_phase() {
  local label="${1:-manual}"

  echo "[replan] replan phase를 시작합니다."
  echo "[replan] 목적: current run의 Live Queue를 더 작고 실행 가능한 단위로 재정렬합니다."
  echo "[replan] label: $label"

  local goal_text
  local extra_context

  goal_text="$(cat <<'EOF'
- Read the current run documents carefully.
- Do not depend on previous-run files in this phase.
- Refine PLAN.md so Live Queue tasks are smaller, clearer, and more executable.
- If a task is too large, split it into smaller pending tasks.
- If the queue order is suboptimal, reorder it.
- If an issue is blocking implementation, capture it under PLAN.md > Open Issues.
- Reconcile SPEC.md and TEST_PLAN.md with the updated queue if needed.
- Do not modify PRODUCT.md in this phase.
- Do not modify UPDATE.md in this phase.
- Do not modify production code in this phase.
- Return PASS only if the current run plan is again in a healthy executable state.
EOF
)"
  extra_context="$(cat <<EOF
Explicitly read current run files:
- $RUN_DIR/REQUIREMENTS.md
- $RUN_DIR/PLAN.md
- $RUN_DIR/SPEC.md
- $RUN_DIR/TEST_PLAN.md
- $RUN_DIR/DONE.md
- $RUN_DIR/CHANGES.md

Do not rely on previous run files unless absolutely necessary.
EOF
)"

  run_codex_phase "replan-$label" "$PLAN_REASONING" "$goal_text" "$extra_context"

  echo "[replan] replan phase가 끝났습니다."
  echo "[replan] gate    : $LAST_GATE"
  echo "[replan] summary : $LAST_SUMMARY"
}
