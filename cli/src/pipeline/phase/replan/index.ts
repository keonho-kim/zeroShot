import { runCodexPhase } from "../../executor.js";
import type { PhaseResult, PipelineContext } from "../../types.js";
import { createPrompt } from "./prompt.js";

export async function replanPhase(ctx: PipelineContext, label: string): Promise<PhaseResult> {
  console.log("[replan] replan phase를 시작합니다.");
  console.log("[replan] 목적: current run의 Live Queue를 더 작고 실행 가능한 단위로 재정렬합니다.");
  console.log(`[replan] label: ${label}`);
  const prompt = createPrompt(ctx);
  const result = await runCodexPhase(ctx, `replan-${label}`, ctx.options.planReasoning, prompt.goal, prompt.extra);
  console.log("[replan] replan phase가 끝났습니다.");
  console.log(`[replan] gate    : ${result.gate}`);
  console.log(`[replan] summary : ${result.summary}`);
  return result;
}
