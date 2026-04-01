#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# scripts/lib/30_schema.sh
#
# Codex 최종 응답 검증용 JSON Schema를 작성합니다.
# 상태는 PASS / FAIL만 사용합니다.
# -----------------------------------------------------------------------------

write_schema() {
  log "[schema] Codex 최종 응답을 검증할 JSON Schema를 작성합니다."

  cat > "$RUN_DIR/final-output.schema.json" <<'EOF'
{
  "type": "object",
  "properties": {
    "phase": { "type": "string" },
    "gate": {
      "type": "string",
      "enum": ["PASS", "FAIL"]
    },
    "progress_made": { "type": "boolean" },
    "queue_empty": { "type": "boolean" },
    "code_changed": { "type": "boolean" },
    "product_sync_safe": { "type": "boolean" },
    "selected_task": { "type": "string" },
    "summary": { "type": "string" },
    "created_files": {
      "type": "array",
      "items": { "type": "string" }
    },
    "updated_files": {
      "type": "array",
      "items": { "type": "string" }
    },
    "commands_run": {
      "type": "array",
      "items": { "type": "string" }
    },
    "tests_run": {
      "type": "array",
      "items": { "type": "string" }
    },
    "next_action": { "type": "string" }
  },
  "required": [
    "phase",
    "gate",
    "progress_made",
    "queue_empty",
    "code_changed",
    "product_sync_safe",
    "selected_task",
    "summary",
    "created_files",
    "updated_files",
    "commands_run",
    "tests_run",
    "next_action"
  ],
  "additionalProperties": false
}
EOF
}
