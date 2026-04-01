#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# scripts/phases/00_prepare.sh
#
# Codex를 호출하지 않는 준비 단계입니다.
# run 디렉터리, logs/input/outputs, schema, run.meta 등을 준비합니다.
# -----------------------------------------------------------------------------

prepare_phase() {
  echo "[prepare] run 준비를 시작합니다."
  prepare_run
  write_schema
  echo "[prepare] run 준비가 완료되었습니다."
}
