import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode, type ThreadEvent } from "@openai/codex-sdk";
import type { Gate, PhaseResult, PipelineContext } from "@cli/pipeline/types.js";
import { buildPrompt } from "@cli/pipeline/phase/common/prompt.js";
import { finalOutputSchema } from "@cli/pipeline/schema.js";
import {
  addPipelineUsage,
  mergePhaseResultIntoState,
  recordPhaseResult as recordStoredPhaseResult,
  recordPipelineEvent,
  readPipelineState
} from "@cli/pipeline/storage.js";

function nextPhase(ctx: PipelineContext): void {
  ctx.phaseSeq += 1;
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function readWorkLogEntries(value: unknown): PhaseResult["workLogEntries"] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
    .map((entry) => ({
      title: typeof entry.title === "string" ? entry.title : "Work item",
      summary: typeof entry.summary === "string" ? entry.summary : "",
      filesChanged: readStringArray(entry.files_changed),
      commandsRun: readStringArray(entry.commands_run),
      validationResult: typeof entry.validation_result === "string" ? entry.validation_result : "",
      result: typeof entry.result === "string" ? entry.result : ""
    }));
}

function readPhaseResult(raw: string, processExit: number, resultRef: string): PhaseResult {
  const fallback: PhaseResult = {
    gate: "FAIL",
    processExit,
    progressMade: false,
    queueEmpty: false,
    codeChanged: false,
    productSyncSafe: false,
    selectedTask: "",
    summary: "",
    resultJson: resultRef,
    workLogEntries: [],
    resultSummary: "",
    changedFiles: [],
    validation: [],
    nextSteps: [],
    openIssues: []
  };

  if (!raw) {
    console.log("[codex] result.json 파일이 생성되지 않았습니다.");
    return fallback;
  }

  console.log("[codex] result.json을 파싱하여 최근 상태 변수를 갱신합니다.");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return {
    gate: parsed.gate === "PASS" ? "PASS" : ("FAIL" satisfies Gate),
    processExit,
    progressMade: readBoolean(parsed.progress_made),
    queueEmpty: readBoolean(parsed.queue_empty),
    codeChanged: readBoolean(parsed.code_changed),
    productSyncSafe: readBoolean(parsed.product_sync_safe),
    selectedTask: typeof parsed.selected_task === "string" ? parsed.selected_task : "",
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    resultJson: resultRef,
    workLogEntries: readWorkLogEntries(parsed.work_log_entries),
    resultSummary: typeof parsed.result_summary === "string" ? parsed.result_summary : "",
    changedFiles: readStringArray(parsed.changed_files),
    validation: readStringArray(parsed.validation),
    nextSteps: readStringArray(parsed.next_steps),
    openIssues: readStringArray(parsed.open_issues)
  };
}

function asApprovalMode(value: string): ApprovalMode {
  if (value === "never" || value === "on-request" || value === "on-failure" || value === "untrusted") {
    return value;
  }
  throw new Error(`Unsupported approval policy: ${value}`);
}

function asSandboxMode(value: string): SandboxMode {
  if (value === "read-only" || value === "workspace-write" || value === "danger-full-access") {
    return value;
  }
  throw new Error(`Unsupported sandbox mode: ${value}`);
}

function asReasoningEffort(value: string): ModelReasoningEffort {
  if (value === "minimal" || value === "low" || value === "medium" || value === "high" || value === "xhigh") {
    return value;
  }
  throw new Error(`Unsupported reasoning effort: ${value}`);
}

function describeCodexEvent(event: ThreadEvent): string {
  if (event.type === "thread.started") {
    return `thread started: ${event.thread_id}`;
  }
  if (event.type === "turn.started") {
    return "turn started";
  }
  if (event.type === "turn.completed") {
    return `turn completed: input=${event.usage.input_tokens} output=${event.usage.output_tokens}`;
  }
  if (event.type === "turn.failed") {
    return `turn failed: ${event.error.message}`;
  }
  if (event.type === "error") {
    return `stream error: ${event.message}`;
  }

  const prefix = event.type.replace("item.", "item ");
  const item = event.item;
  if (item.type === "command_execution") {
    return `${prefix}: command ${item.status} ${item.command}`;
  }
  if (item.type === "file_change") {
    return `${prefix}: file_change ${item.status} ${item.changes.map((change) => `${change.kind}:${change.path}`).join(", ")}`;
  }
  if (item.type === "mcp_tool_call") {
    return `${prefix}: mcp ${item.server}.${item.tool} ${item.status}`;
  }
  if (item.type === "web_search") {
    return `${prefix}: web_search ${item.query}`;
  }
  if (item.type === "agent_message") {
    return `${prefix}: agent_message`;
  }
  return `${prefix}: ${item.type}`;
}

export async function runCodexPhase(
  ctx: PipelineContext,
  phase: string,
  reasoning: string,
  goalText: string,
  extraContext: string
): Promise<PhaseResult> {
  nextPhase(ctx);
  const resultRef = `db://${ctx.runName}/${String(ctx.phaseSeq).padStart(3, "0")}-${phase}`;
  ctx.compactState = await readPipelineState(ctx);
  const prompt = buildPrompt(ctx, phase, reasoning, goalText, extraContext);

  console.log("[codex] ------------------------------------------------------------");
  console.log("[codex] Codex phase 실행을 시작합니다.");
  console.log(`[codex] phase      : ${phase}`);
  console.log(`[codex] reasoning  : ${reasoning}`);
  console.log(`[codex] run        : ${ctx.runName}`);
  console.log("[codex] ------------------------------------------------------------");
  console.log("[contract] Codex prompt는 DB와 SDK outputSchema로만 관리합니다.");

  if (ctx.options.model) {
    console.log(`[codex] 모델 override를 적용합니다: ${ctx.options.model}`);
  }

  console.log("[codex] Codex TypeScript SDK로 phase를 실행합니다.");
  console.log("[codex] skipGitRepoCheck 는 항상 켜져 있습니다.");

  let processExit = 1;
  let finalResponse = "";
  try {
    const codex = new Codex();
    const thread = codex.startThread({
      workingDirectory: ctx.projectRoot,
      skipGitRepoCheck: true,
      approvalPolicy: asApprovalMode(ctx.options.approval),
      sandboxMode: asSandboxMode(ctx.options.sandbox),
      modelReasoningEffort: asReasoningEffort(reasoning),
      additionalDirectories: ctx.options.additionalDirectories,
      ...(ctx.options.model ? { model: ctx.options.model } : {})
    });
    const { events } = await thread.runStreamed(prompt, { outputSchema: finalOutputSchema });

    for await (const event of events) {
      await recordPipelineEvent(ctx, phase, event);
      console.log(`[codex] ${describeCodexEvent(event)}`);

      if (event.type === "item.completed" && event.item.type === "agent_message") {
        finalResponse = event.item.text;
      }
      if (event.type === "turn.completed") {
        await addPipelineUsage(ctx, event.usage.input_tokens, event.usage.output_tokens);
      }
      if (event.type === "turn.failed") {
        throw new Error(event.error.message);
      }
      if (event.type === "error") {
        throw new Error(event.message);
      }
    }

    if (!finalResponse.trim()) {
      throw new Error("Codex SDK did not return a final agent message.");
    }

    processExit = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[codex] SDK phase failed: ${message}`);
    finalResponse = `${JSON.stringify({
      phase,
      gate: "FAIL",
      progress_made: false,
      queue_empty: false,
      code_changed: false,
      product_sync_safe: false,
      selected_task: "",
      summary: `Codex SDK phase failed: ${message}`,
      created_files: [],
      updated_files: [],
      commands_run: [],
      tests_run: [],
      next_action: "Inspect the pipeline event log.",
      work_log_entries: [],
      result_summary: `Codex SDK phase failed: ${message}`,
      changed_files: [],
      validation: [],
      next_steps: ["Inspect the pipeline event log."],
      open_issues: [message]
    }, null, 2)}\n`;
  }

  const result = readPhaseResult(finalResponse.trim(), processExit, resultRef);
  await recordStoredPhaseResult(ctx, phase, result, finalResponse.trim());
  await mergePhaseResultIntoState(ctx, result);

  console.log("[codex] phase 실행이 끝났습니다.");
  console.log(`[codex] process exit       : ${result.processExit}`);
  console.log(`[codex] gate               : ${result.gate}`);
  console.log(`[codex] progress_made      : ${result.progressMade}`);
  console.log(`[codex] queue_empty        : ${result.queueEmpty}`);
  console.log(`[codex] code_changed       : ${result.codeChanged}`);
  console.log(`[codex] product_sync_safe  : ${result.productSyncSafe}`);
  console.log(`[codex] selected_task      : ${result.selectedTask || "<none>"}`);

  if (finalResponse.trim()) {
    console.log("[codex] result.json 내용을 그대로 출력합니다.");
    console.log(finalResponse.trim());
  }

  return result;
}
