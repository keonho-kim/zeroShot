import { appendFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { recordPhaseResult } from "../../executor.js";
import type { PhaseResult, PipelineContext } from "../../types.js";
import { nowHuman } from "../../utils.js";

function readOptional(path: string): Promise<string> {
  return readFile(path, "utf8").catch(() => "");
}

function summarizeManifest(manifest: string): string {
  const lines = manifest.trim().split(/\r?\n/).slice(1);
  if (lines.length === 0) {
    return "- No recorded Codex phases.";
  }

  return lines
    .map((line) => {
      const [seq, phase, gate, processExit, selectedTask, progressMade, queueEmpty, codeChanged] = line.split("\t");
      const task = selectedTask ? ` task=${selectedTask}` : "";
      return `- ${seq} ${phase}: gate=${gate}, exit=${processExit}, progress=${progressMade}, queue_empty=${queueEmpty}, code_changed=${codeChanged}${task}`;
    })
    .join("\n");
}

function tailSections(content: string, maxChars = 2500): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return "_No content recorded._";
  }
  return trimmed.length > maxChars ? `...${trimmed.slice(-maxChars)}` : trimmed;
}

export async function closeoutPhase(ctx: PipelineContext, pipelineFailed: boolean, failureReason: string): Promise<PhaseResult> {
  console.log("[closeout] local closeout phase를 시작합니다.");
  console.log("[closeout] 목표: 추가 Codex 호출 없이 FINAL_REPORT.md를 정리하고 run을 마감합니다.");

  const [manifest, done, changes, plan, testPlan] = await Promise.all([
    readOptional(join(ctx.runLogDir, "000-manifest.tsv")),
    readOptional(join(ctx.runDir, "DONE.md")),
    readOptional(join(ctx.runDir, "CHANGES.md")),
    readOptional(join(ctx.runDir, "PLAN.md")),
    readOptional(join(ctx.runDir, "TEST_PLAN.md"))
  ]);

  const finalReport = `# FINAL_REPORT

## Run Summary
- run_name: ${ctx.runName}
- run_mode: ${ctx.mode}
- created_at: ${nowHuman()}
- final_gate: ${pipelineFailed ? "FAIL" : "PASS"}
- failure_reason: ${pipelineFailed ? failureReason || "unknown" : "none"}
- product_file: ${ctx.productFile}
- update_file: ${ctx.mode === "update" ? ctx.updateFile : ""}
- previous_run_dir: ${ctx.previousRunDir || ""}

## Phase Results
${summarizeManifest(manifest)}

## Completed Work
${tailSections(done)}

## Change Log
${tailSections(changes)}

## Remaining Plan
${tailSections(plan)}

## Validation Notes
${tailSections(testPlan)}

## Closeout Note
This report was generated locally by the pipeline runner to avoid an extra Codex closeout call. It summarizes the current run documents and manifest without inventing additional completion state.
`;

  await writeFile(join(ctx.runDir, "FINAL_REPORT.md"), finalReport, "utf8");
  await appendFile(
    join(ctx.runDir, "CHANGES.md"),
    `\n## ${nowHuman()} closeout\n- Decisions:\n  - Generated FINAL_REPORT.md locally to reduce pipeline latency.\n- Files changed:\n  - FINAL_REPORT.md\n- Commands run:\n  - none\n- Test results:\n  - not run in local closeout\n- Follow-ups:\n  - Review remaining PLAN.md items if final_gate is FAIL.\n`,
    "utf8"
  );

  const result: PhaseResult = {
    gate: "PASS",
    processExit: 0,
    progressMade: true,
    queueEmpty: !/## Live Queue[\s\S]*?### T-\d{3}/.test(plan),
    codeChanged: false,
    productSyncSafe: false,
    selectedTask: "",
    summary: "Generated FINAL_REPORT.md locally without invoking Codex.",
    resultJson: join(ctx.runLogDir, "local-closeout", "result.json")
  };

  await recordPhaseResult(ctx, "closeout", result, {
    "prompt.md": "Local closeout does not invoke Codex. It generates FINAL_REPORT.md from run documents and manifest.\n"
  });

  console.log("[closeout] local closeout phase가 끝났습니다.");
  console.log(`[closeout] gate    : ${result.gate}`);
  console.log(`[closeout] summary : ${result.summary}`);
  return result;
}
