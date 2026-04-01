#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# scripts/lib/20_run_state.sh
#
# run 디렉터리 계산, 최신 run 탐색, 로그 디렉터리 구조 준비,
# UPDATE.md 보관 등의 상태 관리를 담당합니다.
# -----------------------------------------------------------------------------

find_latest_run_dir() {
  local latest=""
  local path
  shopt -s nullglob
  for path in "$WORK_ROOT"/[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9]; do
    latest="$path"
  done
  shopt -u nullglob
  if [[ -n "$latest" ]]; then
    printf '%s\n' "$latest"
  fi
}

next_run_dir() {
  local today
  local max=0
  local path
  local base
  local n

  today="$(date '+%y%m%d')"
  log "[run] 오늘 날짜 기준 다음 run 번호를 계산합니다. today=$today"

  shopt -s nullglob
  for path in "$WORK_ROOT"/"$today"-[0-9][0-9][0-9]; do
    base="$(basename "$path")"
    n="${base##*-}"
    [[ "$n" =~ ^[0-9]{3}$ ]] || continue
    if (( 10#$n > max )); then
      max=$((10#$n))
    fi
  done
  shopt -u nullglob

  printf '%s/%s-%03d\n' "$WORK_ROOT" "$today" "$((max + 1))"
}

setup_run_paths() {
  local run_dir="$1"

  RUN_DIR="$run_dir"
  RUN_NAME="$(basename "$RUN_DIR")"
  RUN_LOG_DIR="$RUN_DIR/logs"
  RUN_INPUT_DIR="$RUN_DIR/input"
  OUTPUTS_DIR="$RUN_DIR/outputs"

  export RUN_DIR RUN_NAME RUN_LOG_DIR RUN_INPUT_DIR OUTPUTS_DIR
}

initialize_run_structure() {
  log "[run] 현재 run 구조를 생성합니다."
  mkdir -p "$RUN_DIR" "$RUN_LOG_DIR" "$RUN_INPUT_DIR" "$OUTPUTS_DIR"

  printf 'seq\tphase\tgate\tprocess_exit\tselected_task\tprogress_made\tqueue_empty\tcode_changed\tproduct_sync_safe\tresult_json_dir\n' \
    > "$RUN_LOG_DIR/000-manifest.tsv"
}

write_run_meta() {
  log "[run] run.meta 파일을 작성합니다."
  cat > "$RUN_DIR/run.meta" <<EOF
run_name=$RUN_NAME
run_dir=$RUN_DIR
repo_root=$ROOT
product_file=$PRODUCT_FILE
update_file=${UPDATE_FILE:-}
created_at=$(now_human)
run_mode=$RUN_MODE
previous_run_dir=${PREVIOUS_RUN_DIR:-}
approval=$APPROVAL
sandbox=$SANDBOX
max_iters=$MAX_ITERS
stall_limit=$STALL_LIMIT
plan_reasoning=$PLAN_REASONING
exec_reasoning=$EXEC_REASONING
validate_reasoning=$VALIDATE_REASONING
closeout_reasoning=$CLOSEOUT_REASONING
EOF
}

prepare_run() {
  ensure_env_and_tools

  log "[run] run 준비를 시작합니다."
  log "[run] RUN_MODE=$RUN_MODE"

  if [[ "$RUN_MODE" == "update" ]]; then
    PREVIOUS_RUN_DIR="$(find_latest_run_dir || true)"
    if [[ -z "$PREVIOUS_RUN_DIR" ]]; then
      log "[run] update 모드지만 이전 run을 찾지 못했습니다."
      exit 1
    fi
    log "[run] update 모드에서 참조할 이전 run: $PREVIOUS_RUN_DIR"
  else
    PREVIOUS_RUN_DIR=""
  fi

  setup_run_paths "$(next_run_dir)"
  initialize_run_structure
  write_run_meta

  printf '%s\n' "$RUN_DIR" > "$ACTIVE_RUN_FILE"

  PHASE_SEQ=0
  export PREVIOUS_RUN_DIR PHASE_SEQ

  log "[run] run 준비가 완료되었습니다."
  log "[run] RUN_DIR       : $RUN_DIR"
  log "[run] RUN_LOG_DIR   : $RUN_LOG_DIR"
  log "[run] RUN_INPUT_DIR : $RUN_INPUT_DIR"
  log "[run] OUTPUTS_DIR   : $OUTPUTS_DIR"
}

next_phase_log_dir() {
  local phase="$1"
  local seq
  local dir_name
  local dir_path

  PHASE_SEQ=$((PHASE_SEQ + 1))
  export PHASE_SEQ

  seq="$(printf '%03d' "$PHASE_SEQ")"
  dir_name="${seq}-${RUN_MODE}-$(slug "$phase")"
  dir_path="$RUN_LOG_DIR/$dir_name"

  mkdir -p "$dir_path"
  printf '%s\n' "$dir_path"
}

append_manifest_row() {
  local phase="$1"
  local gate="$2"
  local process_exit="$3"
  local selected_task="$4"
  local progress_made="$5"
  local queue_empty="$6"
  local code_changed="$7"
  local product_sync_safe="$8"
  local phase_dir="$9"

  printf '%03d\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$PHASE_SEQ" \
    "$phase" \
    "$gate" \
    "$process_exit" \
    "$selected_task" \
    "$progress_made" \
    "$queue_empty" \
    "$code_changed" \
    "$product_sync_safe" \
    "$phase_dir" \
    >> "$RUN_LOG_DIR/000-manifest.tsv"
}

archive_update_input() {
  if [[ "$RUN_MODE" != "update" ]]; then
    log "[run] build 모드이므로 UPDATE.md 이동은 수행하지 않습니다."
    return 0
  fi

  if [[ ! -f "$UPDATE_FILE" ]]; then
    log "[run] UPDATE.md가 이미 이동되었거나 존재하지 않습니다: $UPDATE_FILE"
    return 0
  fi

  log "[run] UPDATE.md를 현재 run의 input/ 디렉터리로 이동합니다."
  mv "$UPDATE_FILE" "$RUN_INPUT_DIR/UPDATE.md"
  log "[run] 이동 완료: $RUN_INPUT_DIR/UPDATE.md"
}
