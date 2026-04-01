#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# scripts/phases/10_requirements_normalize.sh
#
# PRODUCT.md를 제품화 보강 + 개발 요구사항 정규화까지 한 번에 수행합니다.
# build 모드에서는 PRODUCT.md만 기반으로 새 run 문서를 생성합니다.
# update 모드에서는 PRODUCT.md + UPDATE.md + previous run을 비교하여
# 새 current run 문서들을 다시 만듭니다.
# -----------------------------------------------------------------------------

requirements_normalize_phase() {
  echo "[normalize] requirements-normalize phase를 시작합니다."
  echo "[normalize] 목표: PRODUCT.md를 제품화 가능한 REQUIREMENTS/PLAN/SPEC/TEST_PLAN으로 정규화합니다."
  echo "[normalize] RUN_MODE=$RUN_MODE"

  local goal_text
  local extra_context

  if [[ "$RUN_MODE" == "build" ]]; then
    goal_text="$(cat <<'EOF'
- Read PRODUCT.md carefully.
- Treat PRODUCT.md as the source truth for intended product direction.
- If PRODUCT.md is brief, expand it into a product-ready requirement set without inventing false certainty.
- Create or update the current run files:
  - REQUIREMENTS.md
  - PLAN.md
  - SPEC.md
  - TEST_PLAN.md
  - DONE.md
  - CHANGES.md
- REQUIREMENTS.md must include user context, core flows, edge cases, non-functional requirements, assumptions, open questions, requirement list, acceptance criteria, and out-of-scope items.
- PLAN.md must contain a prioritized Live Queue that is immediately usable for implementation.
- DONE.md may start empty, but it must exist.
- Do not modify PRODUCT.md in this phase.
- Do not modify production code in this phase.
- Return PASS only if the current run is ready for implementation work.
EOF
)"
    extra_context="$(cat <<EOF
Explicitly read:
- $PRODUCT_FILE

Then explicitly create or update:
- $RUN_DIR/REQUIREMENTS.md
- $RUN_DIR/PLAN.md
- $RUN_DIR/SPEC.md
- $RUN_DIR/TEST_PLAN.md
- $RUN_DIR/DONE.md
- $RUN_DIR/CHANGES.md
EOF
)"
  else
    goal_text="$(cat <<'EOF'
- Read PRODUCT.md and UPDATE.md carefully.
- Read the previous run documents carefully.
- Treat PRODUCT.md as the base truth and UPDATE.md as the injected change request document.
- Build a fresh current-run requirement set that incorporates the update delta.
- Create or update the current run files:
  - REQUIREMENTS.md
  - PLAN.md
  - SPEC.md
  - TEST_PLAN.md
  - DONE.md
  - CHANGES.md
- REQUIREMENTS.md must contain an explicit "Update Delta Summary" section describing what changed because of UPDATE.md.
- Reuse prior completion history and prior design context when appropriate, but make the current run documents self-sufficient.
- After this phase, the current run documents should be enough to continue implementation without repeatedly depending on the previous run.
- Do not modify PRODUCT.md in this phase.
- Do not modify UPDATE.md in this phase.
- Do not modify production code in this phase.
- Return PASS only if the new current run is ready for implementation work.
EOF
)"
    extra_context="$(cat <<EOF
Explicitly read:
- $PRODUCT_FILE
- $UPDATE_FILE
- $PREVIOUS_RUN_DIR/REQUIREMENTS.md
- $PREVIOUS_RUN_DIR/PLAN.md
- $PREVIOUS_RUN_DIR/SPEC.md
- $PREVIOUS_RUN_DIR/TEST_PLAN.md
- $PREVIOUS_RUN_DIR/DONE.md
- $PREVIOUS_RUN_DIR/CHANGES.md
- $PREVIOUS_RUN_DIR/FINAL_REPORT.md

Then explicitly create or update for the NEW current run:
- $RUN_DIR/REQUIREMENTS.md
- $RUN_DIR/PLAN.md
- $RUN_DIR/SPEC.md
- $RUN_DIR/TEST_PLAN.md
- $RUN_DIR/DONE.md
- $RUN_DIR/CHANGES.md
EOF
)"
  fi

  run_codex_phase "requirements-normalize" "$PLAN_REASONING" "$goal_text" "$extra_context"

  echo "[normalize] requirements-normalize phase가 끝났습니다."
  echo "[normalize] gate    : $LAST_GATE"
  echo "[normalize] summary : $LAST_SUMMARY"
}
