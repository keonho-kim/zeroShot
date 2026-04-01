#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# scripts/phases/40_validate.sh
#
# 코드 변경이 실제로 있었을 때만 더 넓은 범위의 검증을 수행합니다.
# -----------------------------------------------------------------------------

validate_phase() {
  echo "[validate] validate phase를 시작합니다."
  echo "[validate] 목표: 현재 current run 상태를 기준으로 넓은 범위의 검증을 수행합니다."

  local goal_text
  local extra_context

  goal_text="$(cat <<'EOF'
- Read the current run documents carefully.
- Run the broader validation commands that now make sense for the repository state.
- Use TEST_PLAN.md and the repository's own scripts as guidance.
- If a directly related low-risk fix is obvious, you may apply it and rerun the affected checks.
- Update PLAN.md, DONE.md, TEST_PLAN.md, SPEC.md, and CHANGES.md so they reflect the actual validated state.
- Do not modify UPDATE.md in this phase.
- Do not modify PRODUCT.md in this phase.
- Return PASS only if validation work completed safely and the current run documents reflect the real state.
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
- $RUN_LOG_DIR/000-manifest.tsv

Prefer the current run as the working truth.
EOF
)"

  run_codex_phase "validate" "$VALIDATE_REASONING" "$goal_text" "$extra_context"

  echo "[validate] validate phase가 끝났습니다."
  echo "[validate] gate    : $LAST_GATE"
  echo "[validate] summary : $LAST_SUMMARY"
}
