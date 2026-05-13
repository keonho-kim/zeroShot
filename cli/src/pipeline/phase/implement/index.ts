import { runCodexPhase } from "@cli/pipeline/executor.js";
import type { PhaseResult, PipelineContext } from "@cli/pipeline/types.js";
import { createPrompt } from "@cli/pipeline/phase/implement/prompt.js";

export async function iterOnce(ctx: PipelineContext, iter: number): Promise<PhaseResult> {
  console.log("[iter] 구현 iteration을 시작합니다.");
  console.log(`[iter] iteration 번호: ${iter}`);
  console.log("[iter] 목표: PLAN.md의 Live Queue에서 작업 1개만 처리합니다.");
  const prompt = createPrompt(ctx);
  const result = await runCodexPhase(ctx, `implement-${iter}`, ctx.options.execReasoning, prompt.goal, prompt.extra);
  console.log("[iter] iteration이 끝났습니다.");
  console.log(`[iter] gate            : ${result.gate}`);
  console.log(`[iter] selected_task   : ${result.selectedTask || "<none>"}`);
  console.log(`[iter] progress_made   : ${result.progressMade}`);
  console.log(`[iter] queue_empty     : ${result.queueEmpty}`);
  console.log(`[iter] code_changed    : ${result.codeChanged}`);
  console.log(`[iter] summary         : ${result.summary}`);
  return result;
}
