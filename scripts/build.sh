#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# scripts/build.sh
#
# 이 파일은 전체 파이프라인의 메인 엔트리포인트입니다.
# 사용자는 보통 make build 또는 make update만 실행하면 됩니다.
#
# 목표:
# - build 모드: PRODUCT.md를 읽고 제품화 보강 + 구현 + 검증 + 종료 문서화
# - update 모드: PRODUCT.md + UPDATE.md + 직전 run을 비교해서 새 run을 만들고,
#                변경 사항을 구현/검증한 뒤 PRODUCT.md까지 동기화
#
# 상태 모델:
# - Codex phase 결과는 PASS / FAIL 게이트만 사용합니다.
# - 셸은 보조 boolean(progress_made, queue_empty, code_changed 등)만 참고합니다.
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="${PROJECT_ROOT:-${ROOT:-$TOOL_ROOT}}"
export ROOT TOOL_ROOT

cd "$ROOT"

echo "[build] 프로젝트 루트로 이동했습니다: $ROOT"
echo "[build] 도구 루트: $TOOL_ROOT"
echo "[build] 공통 라이브러리와 phase 스크립트를 로드합니다."

source "$TOOL_ROOT/scripts/lib/10_env.sh"
source "$TOOL_ROOT/scripts/lib/20_run_state.sh"
source "$TOOL_ROOT/scripts/lib/30_schema.sh"
source "$TOOL_ROOT/scripts/lib/40_json.sh"
source "$TOOL_ROOT/scripts/lib/50_contract.sh"
source "$TOOL_ROOT/scripts/lib/60_codex.sh"

source "$TOOL_ROOT/scripts/phases/00_prepare.sh"
source "$TOOL_ROOT/scripts/phases/10_requirements_normalize.sh"
source "$TOOL_ROOT/scripts/phases/20_replan.sh"
source "$TOOL_ROOT/scripts/phases/30_iter_once.sh"
source "$TOOL_ROOT/scripts/phases/40_validate.sh"
source "$TOOL_ROOT/scripts/phases/50_sync_product.sh"
source "$TOOL_ROOT/scripts/phases/90_closeout.sh"

main() {
  echo "[build] 전체 파이프라인을 시작합니다."
  echo "[build] 실행 모드(RUN_MODE): $RUN_MODE"

  local iter=1
  local stall_count=0
  local queue_empty="false"
  local any_code_changed="false"
  local ran_validate="false"
  local validate_gate="PASS"
  local sync_gate="PASS"
  local should_archive_update="false"
  local pipeline_failed="false"
  local failure_reason=""

  echo "[build] 1단계: run 준비를 수행합니다."
  prepare_phase

  echo "[build] 2단계: requirements-normalize를 수행합니다."
  requirements_normalize_phase

  if [[ "$LAST_GATE" != "PASS" ]]; then
    echo "[build] requirements-normalize가 FAIL을 반환했습니다."
    pipeline_failed="true"
    failure_reason="requirements_normalize_failed"
  fi

  if [[ "$LAST_CODE_CHANGED" == "true" ]]; then
    any_code_changed="true"
  fi

  queue_empty="$LAST_QUEUE_EMPTY"

  if [[ "$pipeline_failed" == "false" && "$queue_empty" != "true" ]]; then
    echo "[build] 3단계: 구현 반복 루프를 시작합니다."
    echo "[build] MAX_ITERS   : $MAX_ITERS"
    echo "[build] STALL_LIMIT : $STALL_LIMIT"

    while (( iter <= MAX_ITERS )); do
      echo "[build] ------------------------------------------------------------"
      echo "[build] 구현 반복을 시작합니다. iteration=$iter"
      echo "[build] 현재 stall_count=$stall_count"
      echo "[build] ------------------------------------------------------------"

      iter_once "$iter"

      if [[ "$LAST_CODE_CHANGED" == "true" ]]; then
        any_code_changed="true"
      fi

      if [[ "$LAST_GATE" != "PASS" ]]; then
        echo "[build] iteration이 FAIL을 반환했습니다. replan을 시도합니다."
        replan_phase "$iter"

        if [[ "$LAST_GATE" != "PASS" ]]; then
          echo "[build] replan까지 FAIL을 반환했습니다. 구현 루프를 종료합니다."
          pipeline_failed="true"
          failure_reason="replan_failed_after_iter_fail"
          break
        fi

        echo "[build] replan이 PASS로 끝났습니다. 다음 iteration으로 넘어갑니다."
        stall_count=0
        iter=$((iter + 1))
        continue
      fi

      queue_empty="$LAST_QUEUE_EMPTY"

      if [[ "$queue_empty" == "true" ]]; then
        echo "[build] Live Queue가 비었습니다. 구현 루프를 종료합니다."
        break
      fi

      if [[ "$LAST_PROGRESS_MADE" == "true" ]]; then
        echo "[build] 이번 iteration에서 진전이 있었습니다. stall_count를 0으로 초기화합니다."
        stall_count=0
      else
        echo "[build] 이번 iteration에서 진전이 뚜렷하지 않았습니다. stall_count를 증가시킵니다."
        stall_count=$((stall_count + 1))
      fi

      if (( stall_count >= STALL_LIMIT )); then
        echo "[build] stall 한도에 도달했습니다. replan을 수행합니다."
        PIPELINE_NOTE="최근 iteration에서 충분한 진전이 없었습니다. Live Queue를 더 작고 실행 가능한 작업으로 재구성하세요."
        replan_phase "$iter"

        if [[ "$LAST_GATE" != "PASS" ]]; then
          echo "[build] replan이 FAIL을 반환했습니다. 구현 루프를 종료합니다."
          pipeline_failed="true"
          failure_reason="replan_failed_after_stall"
          break
        fi

        echo "[build] replan이 PASS로 끝났습니다. stall_count를 0으로 초기화합니다."
        stall_count=0
      fi

      iter=$((iter + 1))
    done
  fi

  if [[ "$pipeline_failed" == "false" && "$queue_empty" != "true" && "$iter" -gt "$MAX_ITERS" ]]; then
    echo "[build] 최대 iteration 횟수에 도달했습니다."
    pipeline_failed="true"
    failure_reason="max_iters_reached_before_queue_empty"
    PIPELINE_NOTE="최대 iteration 횟수에 도달했습니다. 남은 작업을 PLAN.md와 FINAL_REPORT.md에 정직하게 기록하세요."
  fi

  echo "[build] 4단계: 조건부 validate를 검토합니다."
  if [[ "$any_code_changed" == "true" ]]; then
    echo "[build] 코드 변경이 감지되어 validate를 수행합니다."
    validate_phase
    ran_validate="true"
    validate_gate="$LAST_GATE"

    if [[ "$validate_gate" != "PASS" ]]; then
      echo "[build] validate가 FAIL을 반환했습니다."
      pipeline_failed="true"
      if [[ -z "$failure_reason" ]]; then
        failure_reason="validate_failed"
      fi
    fi
  else
    echo "[build] 코드 변경이 없어 full validate는 생략합니다."
  fi

  if [[ "$RUN_MODE" == "update" ]]; then
    echo "[build] 5단계: update 모드이므로 PRODUCT.md 동기화 가능 여부를 검토합니다."

    if [[ "$queue_empty" == "true" ]]; then
      if [[ "$ran_validate" == "true" && "$validate_gate" != "PASS" ]]; then
        echo "[build] validate가 실패했으므로 PRODUCT.md 동기화는 수행하지 않습니다."
      else
        echo "[build] queue가 비어 있고 validate 조건도 충족했으므로 PRODUCT.md 동기화를 시도합니다."
        sync_product_phase
        sync_gate="$LAST_GATE"

        if [[ "$sync_gate" == "PASS" ]]; then
          echo "[build] PRODUCT.md 동기화가 PASS로 끝났습니다."
          should_archive_update="true"
        else
          echo "[build] PRODUCT.md 동기화가 FAIL을 반환했습니다."
          pipeline_failed="true"
          if [[ -z "$failure_reason" ]]; then
            failure_reason="sync_product_failed"
          fi
        fi
      fi
    else
      echo "[build] queue가 비어 있지 않으므로 PRODUCT.md 동기화를 수행하지 않습니다."
    fi
  fi

  echo "[build] 6단계: closeout을 수행합니다."
  if [[ "$pipeline_failed" == "true" ]]; then
    PIPELINE_NOTE="이 run은 하나 이상의 FAIL 게이트를 겪었습니다. FINAL_REPORT.md에 실제 실패 지점과 남은 작업을 정직하게 기록하세요. failure_reason=${failure_reason:-unknown}"
  else
    PIPELINE_NOTE="이 run은 주요 게이트를 PASS로 통과했습니다. FINAL_REPORT.md에 완료 범위와 남은 리스크를 정직하게 기록하세요."
  fi

  closeout_phase

  if [[ "$LAST_GATE" != "PASS" ]]; then
    echo "[build] closeout도 FAIL을 반환했습니다."
    pipeline_failed="true"
    if [[ -z "$failure_reason" ]]; then
      failure_reason="closeout_failed"
    fi
  fi

  if [[ "$RUN_MODE" == "update" && "$should_archive_update" == "true" && "$LAST_GATE" == "PASS" ]]; then
    echo "[build] closeout까지 PASS로 끝났으므로 UPDATE.md를 input/ 아래로 이동합니다."
    archive_update_input
  fi

  echo "[build] ============================================================"
  echo "[build] 전체 파이프라인이 종료되었습니다."
  echo "[build] Run mode      : $RUN_MODE"
  echo "[build] Run directory : $RUN_DIR"
  echo "[build] Logs directory: $RUN_LOG_DIR"
  echo "[build] Manifest file : $RUN_LOG_DIR/000-manifest.tsv"
  echo "[build] PRODUCT.md    : $PRODUCT_FILE"
  [[ "$RUN_MODE" == "update" ]] && echo "[build] UPDATE.md     : ${UPDATE_FILE:-<none>}"
  [[ -n "${PREVIOUS_RUN_DIR:-}" ]] && echo "[build] Previous run  : $PREVIOUS_RUN_DIR"
  echo "[build] REQUIREMENTS : $RUN_DIR/REQUIREMENTS.md"
  echo "[build] PLAN.md      : $RUN_DIR/PLAN.md"
  echo "[build] SPEC.md      : $RUN_DIR/SPEC.md"
  echo "[build] TEST_PLAN.md : $RUN_DIR/TEST_PLAN.md"
  echo "[build] DONE.md      : $RUN_DIR/DONE.md"
  echo "[build] CHANGES.md   : $RUN_DIR/CHANGES.md"
  echo "[build] FINAL_REPORT : $RUN_DIR/FINAL_REPORT.md"
  if [[ "$pipeline_failed" == "true" ]]; then
    echo "[build] 최종 결과    : FAIL"
    echo "[build] failure_reason: ${failure_reason:-unknown}"
    echo "[build] ============================================================"
    exit 1
  else
    echo "[build] 최종 결과    : PASS"
    echo "[build] ============================================================"
    exit 0
  fi
}

main "$@"
