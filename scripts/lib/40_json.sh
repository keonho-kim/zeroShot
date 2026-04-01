#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# scripts/lib/40_json.sh
#
# JSON 파싱만 담당합니다.
# shell heredoc python 대신 scripts/python/get_json.py를 uv run으로 호출합니다.
# -----------------------------------------------------------------------------

json_get() {
  local file="$1"
  local key="$2"

  log "[json] JSON 값을 추출합니다. file=$file key=$key"
  python3 "${TOOL_ROOT:-$ROOT}/scripts/python/get_json.py" "$file" "$key"
}
