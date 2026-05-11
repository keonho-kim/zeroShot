import { runCodexPhase } from "../../executor.js";
import type { PhaseResult, PipelineContext } from "../../types.js";
import { createPrompt } from "./prompt.js";

export async function syncProductPhase(ctx: PipelineContext): Promise<PhaseResult> {
  console.log("[sync-product] PRODUCT.md 동기화 phase를 시작합니다.");
  console.log("[sync-product] 목표: update 결과를 PRODUCT.md에 반영합니다.");
  const prompt = createPrompt(ctx);
  const result = await runCodexPhase(ctx, "sync-product", ctx.options.planReasoning, prompt.goal, prompt.extra);
  console.log("[sync-product] PRODUCT.md 동기화 phase가 끝났습니다.");
  console.log(`[sync-product] gate    : ${result.gate}`);
  console.log(`[sync-product] summary : ${result.summary}`);
  return result;
}
