#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# scripts/phases/50_sync_product.sh
#
# update 모드에서만 사용합니다.
# current run의 REQUIREMENTS/PLAN/SPEC/FINAL_REPORT를 바탕으로 PRODUCT.md를
# 안전하게 동기화합니다.
# -----------------------------------------------------------------------------

sync_product_phase() {
  echo "[sync-product] PRODUCT.md 동기화 phase를 시작합니다."
  echo "[sync-product] 목표: update 결과를 PRODUCT.md에 반영합니다."

  local goal_text
  local extra_context

  goal_text="$(cat <<'EOF'
- Read PRODUCT.md, UPDATE.md, and the current run documents carefully.
- Update PRODUCT.md so it reflects the accepted updated requirements for this run.
- Preserve PRODUCT.md as a coherent product document rather than dumping implementation notes into it.
- Use REQUIREMENTS.md, PLAN.md, SPEC.md, TEST_PLAN.md, DONE.md, and FINAL_REPORT.md as grounding.
- Do not move or delete UPDATE.md in this phase; the shell will handle archival after a PASS result.
- Return PASS only if PRODUCT.md was safely synchronized and remains coherent.
- Return FAIL if synchronization would be unsafe, incomplete, or misleading.
EOF
)"
  extra_context="$(cat <<EOF
Explicitly read:
- $PRODUCT_FILE
- $UPDATE_FILE
- $RUN_DIR/REQUIREMENTS.md
- $RUN_DIR/PLAN.md
- $RUN_DIR/SPEC.md
- $RUN_DIR/TEST_PLAN.md
- $RUN_DIR/DONE.md
- $RUN_DIR/CHANGES.md
- $RUN_DIR/FINAL_REPORT.md

PRODUCT.md is the file to update in this phase.
EOF
)"

  run_codex_phase "sync-product" "$PLAN_REASONING" "$goal_text" "$extra_context"

  echo "[sync-product] PRODUCT.md 동기화 phase가 끝났습니다."
  echo "[sync-product] gate    : $LAST_GATE"
  echo "[sync-product] summary : $LAST_SUMMARY"
}
