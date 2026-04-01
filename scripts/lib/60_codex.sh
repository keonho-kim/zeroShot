#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# scripts/lib/60_codex.sh
#
# Codex 실행 래퍼입니다.
# prompt 생성, codex exec 실행, 결과 파싱, manifest 기록을 처리합니다.
# -----------------------------------------------------------------------------

run_codex_phase() {
  local phase="$1"
  local reasoning="$2"
  local goal_text="$3"
  local extra_context="${4:-}"

  local phase_dir
  local prompt_file
  local jsonl_file
  local stderr_file
  local final_json
  local -a cmd

  phase_dir="$(next_phase_log_dir "$phase")"

  prompt_file="$phase_dir/prompt.md"
  jsonl_file="$phase_dir/events.jsonl"
  stderr_file="$phase_dir/stderr.log"
  final_json="$phase_dir/result.json"

  echo "[codex] ------------------------------------------------------------"
  echo "[codex] Codex phase 실행을 시작합니다."
  echo "[codex] phase      : $phase"
  echo "[codex] reasoning  : $reasoning"
  echo "[codex] phase dir  : $phase_dir"
  echo "[codex] ------------------------------------------------------------"

  write_prompt_file "$phase" "$reasoning" "$goal_text" "$extra_context" "$prompt_file"

  cmd=(
    codex exec
    --cd "$ROOT"
    --ask-for-approval "$APPROVAL"
    --sandbox "$SANDBOX"
    --skip-git-repo-check
    --json
    --output-schema "$RUN_DIR/final-output.schema.json"
    -o "$final_json"
    -c "model_reasoning_effort=\"$reasoning\""
  )

  if [[ -n "$MODEL" ]]; then
    echo "[codex] 모델 override를 적용합니다: $MODEL"
    cmd+=(--model "$MODEL")
  fi

  cmd+=(-)

  echo "[codex] Codex 명령을 실행합니다."
  echo "[codex] --skip-git-repo-check 는 항상 켜져 있습니다."

  set +e
  "${cmd[@]}" < "$prompt_file" > "$jsonl_file" 2> "$stderr_file"
  LAST_PROCESS_EXIT=$?
  set -e

  LAST_GATE="FAIL"
  LAST_PROGRESS_MADE="false"
  LAST_QUEUE_EMPTY="false"
  LAST_CODE_CHANGED="false"
  LAST_PRODUCT_SYNC_SAFE="false"
  LAST_SELECTED_TASK=""
  LAST_SUMMARY=""
  LAST_RESULT_JSON="$final_json"

  if [[ -f "$final_json" ]]; then
    echo "[codex] result.json을 파싱하여 최근 상태 변수를 갱신합니다."
    LAST_GATE="$(json_get "$final_json" gate 2>/dev/null || echo FAIL)"
    LAST_PROGRESS_MADE="$(json_get "$final_json" progress_made 2>/dev/null || echo false)"
    LAST_QUEUE_EMPTY="$(json_get "$final_json" queue_empty 2>/dev/null || echo false)"
    LAST_CODE_CHANGED="$(json_get "$final_json" code_changed 2>/dev/null || echo false)"
    LAST_PRODUCT_SYNC_SAFE="$(json_get "$final_json" product_sync_safe 2>/dev/null || echo false)"
    LAST_SELECTED_TASK="$(json_get "$final_json" selected_task 2>/dev/null || true)"
    LAST_SUMMARY="$(json_get "$final_json" summary 2>/dev/null || true)"
  else
    echo "[codex] result.json 파일이 생성되지 않았습니다."
  fi

  append_manifest_row \
    "$phase" \
    "$LAST_GATE" \
    "$LAST_PROCESS_EXIT" \
    "${LAST_SELECTED_TASK:-}" \
    "$LAST_PROGRESS_MADE" \
    "$LAST_QUEUE_EMPTY" \
    "$LAST_CODE_CHANGED" \
    "$LAST_PRODUCT_SYNC_SAFE" \
    "$phase_dir"

  echo "[codex] phase 실행이 끝났습니다."
  echo "[codex] process exit       : $LAST_PROCESS_EXIT"
  echo "[codex] gate               : $LAST_GATE"
  echo "[codex] progress_made      : $LAST_PROGRESS_MADE"
  echo "[codex] queue_empty        : $LAST_QUEUE_EMPTY"
  echo "[codex] code_changed       : $LAST_CODE_CHANGED"
  echo "[codex] product_sync_safe  : $LAST_PRODUCT_SYNC_SAFE"
  echo "[codex] selected_task      : ${LAST_SELECTED_TASK:-<none>}"

  if [[ -f "$final_json" ]]; then
    echo "[codex] result.json 내용을 그대로 출력합니다."
    cat "$final_json"
    echo
  fi
}
