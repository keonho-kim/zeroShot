import type { PhaseResult, PipelineContext } from "@cli/pipeline/types";
import { completePipelineRun, mergePhaseResultIntoState, readPipelineState, recordPhaseResult } from "@cli/pipeline/storage";
import { writeRunHtmlReports } from "@cli/pipeline/html-report";

export async function closeoutPhase(ctx: PipelineContext, pipelineFailed: boolean, failureReason: string): Promise<PhaseResult> {
  console.log("[closeout] local closeout phase를 시작합니다.");
  console.log("[closeout] 사용자용 interactive HTML 보고서를 생성합니다.");
  ctx.phaseSeq += 1;

  const state = await readPipelineState(ctx);
  const paths = await writeRunHtmlReports(ctx, state, pipelineFailed, failureReason);

  const result: PhaseResult = {
    gate: "PASS",
    processExit: 0,
    progressMade: true,
    queueEmpty: state.nextSteps.length === 0 && state.openIssues.length === 0,
    codeChanged: false,
    productSyncSafe: false,
    selectedTask: "",
    summary: "Generated user-facing HTML run reports.",
    resultJson: `db://${ctx.runName}/${String(ctx.phaseSeq).padStart(3, "0")}-closeout`,
    workLogEntries: [{
      title: "Run closeout",
      summary: "Generated interactive work log and result report for the user.",
      filesChanged: [paths.workLogHtml, paths.resultReportHtml],
      commandsRun: [],
      validationResult: "Local report rendering completed.",
      result: pipelineFailed ? "Run completed with failures." : "Run completed successfully."
    }],
    resultSummary: state.latestSummary || (pipelineFailed ? "Run completed with failures." : "Run completed successfully."),
    changedFiles: [],
    validation: state.validation,
    nextSteps: state.nextSteps,
    openIssues: pipelineFailed ? [failureReason || "unknown failure", ...state.openIssues] : state.openIssues
  };

  await mergePhaseResultIntoState(ctx, result);
  await recordPhaseResult(ctx, "closeout", result, JSON.stringify(result, null, 2));
  await completePipelineRun(ctx, pipelineFailed ? "failed" : "completed", paths);

  console.log("[closeout] local closeout phase가 끝났습니다.");
  console.log(`[closeout] work log      : ${paths.workLogHtml}`);
  console.log(`[closeout] result report : ${paths.resultReportHtml}`);
  return result;
}
