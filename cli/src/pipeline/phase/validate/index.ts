import { runCodexPhase } from "../../executor.js";
import type { PhaseResult, PipelineContext } from "../../types.js";
import { createPrompt } from "./prompt.js";

export async function validatePhase(ctx: PipelineContext): Promise<PhaseResult> {
  console.log("[validate] validate phase를 시작합니다.");
  console.log("[validate] 목표: 현재 current run 상태를 기준으로 넓은 범위의 검증을 수행합니다.");
  const prompt = createPrompt(ctx);
  const result = await runCodexPhase(ctx, "validate", ctx.options.validateReasoning, prompt.goal, prompt.extra);
  console.log("[validate] validate phase가 끝났습니다.");
  console.log(`[validate] gate    : ${result.gate}`);
  console.log(`[validate] summary : ${result.summary}`);
  return result;
}
