import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PipelineContext } from "@cli/pipeline/types.js";

export const finalOutputSchema = {
  type: "object",
  properties: {
    phase: { type: "string" },
    gate: {
      type: "string",
      enum: ["PASS", "FAIL"]
    },
    progress_made: { type: "boolean" },
    queue_empty: { type: "boolean" },
    code_changed: { type: "boolean" },
    product_sync_safe: { type: "boolean" },
    selected_task: { type: "string" },
    summary: { type: "string" },
    created_files: {
      type: "array",
      items: { type: "string" }
    },
    updated_files: {
      type: "array",
      items: { type: "string" }
    },
    commands_run: {
      type: "array",
      items: { type: "string" }
    },
    tests_run: {
      type: "array",
      items: { type: "string" }
    },
    next_action: { type: "string" },
    work_log_entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          files_changed: {
            type: "array",
            items: { type: "string" }
          },
          commands_run: {
            type: "array",
            items: { type: "string" }
          },
          validation_result: { type: "string" },
          result: { type: "string" }
        },
        required: ["title", "summary", "files_changed", "commands_run", "validation_result", "result"],
        additionalProperties: false
      }
    },
    result_summary: { type: "string" },
    changed_files: {
      type: "array",
      items: { type: "string" }
    },
    validation: {
      type: "array",
      items: { type: "string" }
    },
    next_steps: {
      type: "array",
      items: { type: "string" }
    },
    open_issues: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: [
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
    "next_action",
    "work_log_entries",
    "result_summary",
    "changed_files",
    "validation",
    "next_steps",
    "open_issues"
  ],
  additionalProperties: false
};

export async function writeSchema(ctx: PipelineContext): Promise<void> {
  console.log("[schema] Codex 최종 응답 스키마는 SDK outputSchema로만 사용합니다.");
  if (process.env.ZEROSHOT_DEBUG_HISTORY_FILES === "1") {
    await writeFile(join(ctx.runDir, "final-output.schema.json"), `${JSON.stringify(finalOutputSchema, null, 2)}\n`, "utf8");
  }
}
