import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode, type ThreadEvent } from "@openai/codex-sdk";
import { appendFile, mkdir, open, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Gate, PhaseResult, PipelineContext } from "@cli/pipeline/types.js";
import { slug } from "@cli/pipeline/utils.js";
import { buildPrompt } from "@cli/pipeline/phase/common/prompt.js";
import { finalOutputSchema } from "@cli/pipeline/schema.js";

async function nextPhaseLogDir(ctx: PipelineContext, phase: string): Promise<string> {
  ctx.phaseSeq += 1;
  const seq = String(ctx.phaseSeq).padStart(3, "0");
  const dirPath = join(ctx.runLogDir, `${seq}-${ctx.mode}-${slug(phase)}`);
  await mkdir(dirPath, { recursive: true });
  return dirPath;
}

async function appendManifestRow(ctx: PipelineContext, phase: string, result: PhaseResult, phaseDir: string): Promise<void> {
  const row = [
    String(ctx.phaseSeq).padStart(3, "0"),
    phase,
    result.gate,
    String(result.processExit),
    result.selectedTask,
    String(result.progressMade),
    String(result.queueEmpty),
    String(result.codeChanged),
    String(result.productSyncSafe),
    phaseDir
  ].join("\t");
  await appendFile(join(ctx.runLogDir, "000-manifest.tsv"), `${row}\n`, "utf8");
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

async function readPhaseResult(finalJson: string, processExit: number): Promise<PhaseResult> {
  const fallback: PhaseResult = {
    gate: "FAIL",
    processExit,
    progressMade: false,
    queueEmpty: false,
    codeChanged: false,
    productSyncSafe: false,
    selectedTask: "",
    summary: "",
    resultJson: finalJson
  };

  const raw = await readFile(finalJson, "utf8").catch(() => "");
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
    resultJson: finalJson
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

export async function recordPhaseResult(
  ctx: PipelineContext,
  phase: string,
  result: PhaseResult,
  files: Record<string, string> = {}
): Promise<void> {
  const phaseDir = await nextPhaseLogDir(ctx, phase);
  await Promise.all(Object.entries(files).map(([name, content]) => writeFile(join(phaseDir, name), content, "utf8")));
  await writeFile(join(phaseDir, "result.json"), `${JSON.stringify({
    phase,
    gate: result.gate,
    progress_made: result.progressMade,
    queue_empty: result.queueEmpty,
    code_changed: result.codeChanged,
    product_sync_safe: result.productSyncSafe,
    selected_task: result.selectedTask,
    summary: result.summary,
    created_files: [],
    updated_files: [],
    commands_run: [],
    tests_run: [],
    next_action: ""
  }, null, 2)}\n`, "utf8");
  await appendManifestRow(ctx, phase, result, phaseDir);
}

export async function runCodexPhase(
  ctx: PipelineContext,
  phase: string,
  reasoning: string,
  goalText: string,
  extraContext: string
): Promise<PhaseResult> {
  const phaseDir = await nextPhaseLogDir(ctx, phase);
  const promptFile = join(phaseDir, "prompt.md");
  const jsonlFile = join(phaseDir, "events.jsonl");
  const stderrFile = join(phaseDir, "stderr.log");
  const finalJson = join(phaseDir, "result.json");
  const prompt = buildPrompt(ctx, phase, reasoning, goalText, extraContext);
  await writeFile(promptFile, prompt, "utf8");

  console.log("[codex] ------------------------------------------------------------");
  console.log("[codex] Codex phase 실행을 시작합니다.");
  console.log(`[codex] phase      : ${phase}`);
  console.log(`[codex] reasoning  : ${reasoning}`);
  console.log(`[codex] phase dir  : ${phaseDir}`);
  console.log("[codex] ------------------------------------------------------------");
  console.log(`[contract] Codex prompt 파일을 생성합니다. phase=${phase} out=${promptFile}`);

  if (ctx.options.model) {
    console.log(`[codex] 모델 override를 적용합니다: ${ctx.options.model}`);
  }

  console.log("[codex] Codex TypeScript SDK로 phase를 실행합니다.");
  console.log("[codex] skipGitRepoCheck 는 항상 켜져 있습니다.");

  const stdoutFile = await open(jsonlFile, "w");
  let processExit = 1;
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
    let finalResponse = "";

    for await (const event of events) {
      await stdoutFile.write(`${JSON.stringify(event)}\n`);
      console.log(`[codex] ${describeCodexEvent(event)}`);

      if (event.type === "item.completed" && event.item.type === "agent_message") {
        finalResponse = event.item.text;
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

    await writeFile(finalJson, `${finalResponse.trim()}\n`, "utf8");
    processExit = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeFile(stderrFile, `${message}\n`, "utf8");
    console.error(`[codex] SDK phase failed: ${message}`);
  } finally {
    await stdoutFile.close();
  }

  if (processExit !== 0) {
    await writeFile(
      finalJson,
      `${JSON.stringify({
        phase,
        gate: "FAIL",
        progress_made: false,
        queue_empty: false,
        code_changed: false,
        product_sync_safe: false,
        selected_task: "",
        summary: `Codex SDK phase failed. See ${stderrFile}.`,
        created_files: [],
        updated_files: [],
        commands_run: [],
        tests_run: [],
        next_action: "Inspect the phase stderr log."
      }, null, 2)}\n`,
      "utf8"
    );
  }

  const result = await readPhaseResult(finalJson, processExit);
  await appendManifestRow(ctx, phase, result, phaseDir);

  console.log("[codex] phase 실행이 끝났습니다.");
  console.log(`[codex] process exit       : ${result.processExit}`);
  console.log(`[codex] gate               : ${result.gate}`);
  console.log(`[codex] progress_made      : ${result.progressMade}`);
  console.log(`[codex] queue_empty        : ${result.queueEmpty}`);
  console.log(`[codex] code_changed       : ${result.codeChanged}`);
  console.log(`[codex] product_sync_safe  : ${result.productSyncSafe}`);
  console.log(`[codex] selected_task      : ${result.selectedTask || "<none>"}`);

  const rawResult = await readFile(finalJson, "utf8").catch(() => "");
  if (rawResult) {
    console.log("[codex] result.json 내용을 그대로 출력합니다.");
    console.log(rawResult);
  }

  return result;
}
