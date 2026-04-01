#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# scripts/lib/10_env.sh
#
# 환경 변수, 기본 경로, 전역 상태 변수, 공통 유틸 함수를 정의합니다.
# stdout에 값을 반환해야 하는 함수는 로그를 stderr로 보냅니다.
# -----------------------------------------------------------------------------

ROOT="${ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
PRODUCT_FILE="${PRODUCT_FILE:-$ROOT/PRODUCT.md}"
UPDATE_FILE="${UPDATE_FILE:-$ROOT/UPDATE.md}"

WORK_ROOT="${WORK_ROOT:-$ROOT/.work.history}"
ACTIVE_RUN_FILE="${ACTIVE_RUN_FILE:-$WORK_ROOT/.active_run}"

APPROVAL="${APPROVAL:-never}"
SANDBOX="${SANDBOX:-workspace-write}"
MODEL="${MODEL:-}"

MAX_ITERS="${MAX_ITERS:-30}"
STALL_LIMIT="${STALL_LIMIT:-2}"

PLAN_REASONING="${PLAN_REASONING:-high}"
EXEC_REASONING="${EXEC_REASONING:-medium}"
VALIDATE_REASONING="${VALIDATE_REASONING:-medium}"
CLOSEOUT_REASONING="${CLOSEOUT_REASONING:-medium}"

RUN_MODE="${MODE:-build}"
PIPELINE_NOTE="${PIPELINE_NOTE:-}"

LAST_PROCESS_EXIT=0
LAST_GATE="FAIL"
LAST_PROGRESS_MADE="false"
LAST_QUEUE_EMPTY="false"
LAST_CODE_CHANGED="false"
LAST_PRODUCT_SYNC_SAFE="false"
LAST_SELECTED_TASK=""
LAST_SUMMARY=""
LAST_RESULT_JSON=""

RUN_DIR=""
RUN_NAME=""
RUN_LOG_DIR=""
RUN_INPUT_DIR=""
OUTPUTS_DIR=""
PREVIOUS_RUN_DIR=""
PHASE_SEQ=0

log() {
  echo "$@" >&2
}

require_cmd() {
  local cmd="$1"
  log "[env] 필수 명령어 존재 여부를 확인합니다: $cmd"
  command -v "$cmd" >/dev/null 2>&1 || {
    log "[env] 필수 명령어를 찾지 못했습니다: $cmd"
    exit 1
  }
}

now_human() {
  date '+%Y-%m-%d %H:%M:%S'
}

slug() {
  printf '%s' "$1" | tr '[:space:]/:' '___' | tr -cd '[:alnum:]_.-'
}

ensure_env_and_tools() {
  log "[env] 환경 변수와 필수 도구를 점검합니다."
  log "[env] ROOT         : $ROOT"
  log "[env] PRODUCT_FILE : $PRODUCT_FILE"
  log "[env] UPDATE_FILE  : $UPDATE_FILE"
  log "[env] WORK_ROOT    : $WORK_ROOT"
  log "[env] RUN_MODE     : $RUN_MODE"

  mkdir -p "$WORK_ROOT"

  require_cmd codex
  require_cmd uv

  if [[ ! -f "$PRODUCT_FILE" ]]; then
    log "[env] PRODUCT.md를 찾지 못했습니다: $PRODUCT_FILE"
    exit 1
  fi

  if [[ "$RUN_MODE" == "update" && ! -f "$UPDATE_FILE" ]]; then
    log "[env] update 모드에서는 UPDATE.md가 필요합니다: $UPDATE_FILE"
    exit 1
  fi

  log "[env] 환경과 도구 점검이 완료되었습니다."
}
