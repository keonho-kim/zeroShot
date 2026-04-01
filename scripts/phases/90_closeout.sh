#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# scripts/phases/90_closeout.sh
#
# 마지막 정리 phase입니다.
# FINAL_REPORT.md를 생성/갱신하고, 남은 작업과 실제 상태를 정직하게 기록합니다.
# -----------------------------------------------------------------------------

closeout_phase() {
  echo "[closeout] closeout phase를 시작합니다."
  echo "[closeout] 목표: FINAL_REPORT.md를 정리하고 run을 마감합니다."

  local goal_text
  local extra_context

  goal_text="$(cat <<'EOF'
- Read the current run documents carefully.
- Create or update FINAL_REPORT.md.
- FINAL_REPORT.md must summarize:
  - the interpreted product goal
  - completed scope
  - deferred or unfinished scope
  - key code and document changes
  - validations run and results
  - remaining risks
  - recommended next actions
- Ensure PLAN.md does not pretend unfinished work is done.
- Ensure DONE.md contains every completed task that left the Live Queue.
- In update mode, mention whether PRODUCT.md synchronization succeeded.
- Do not invent success.
- Return PASS only if closeout documentation was safely completed.
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
- $RUN_DIR/FINAL_REPORT.md
- $RUN_LOG_DIR/000-manifest.tsv

In update mode, also note:
- UPDATE file path was: $UPDATE_FILE
- Previous run path was: ${PREVIOUS_RUN_DIR:-<none>}
EOF
)"

  run_codex_phase "closeout" "$CLOSEOUT_REASONING" "$goal_text" "$extra_context"

  echo "[closeout] closeout phase가 끝났습니다."
  echo "[closeout] gate    : $LAST_GATE"
  echo "[closeout] summary : $LAST_SUMMARY"
}
