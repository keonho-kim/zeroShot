import { runCodexPhase } from "@cli/pipeline/executor";
import type { PhaseResult, PipelineContext } from "@cli/pipeline/types";
import { createPrompt } from "@cli/pipeline/phase/requirements-normalize/prompt";

export async function requirementsNormalizePhase(ctx: PipelineContext): Promise<PhaseResult> {
  console.log("[normalize] requirements-normalize phase를 시작합니다.");
  console.log("[normalize] 목표: PRODUCT.html을 compact pipeline state로 정규화합니다.");
  console.log(`[normalize] RUN_MODE=${ctx.mode}`);
  const prompt = createPrompt(ctx);
  const result = await runCodexPhase(ctx, "requirements-normalize", ctx.options.planReasoning, prompt.goal, prompt.extra);
  console.log("[normalize] requirements-normalize phase가 끝났습니다.");
  console.log(`[normalize] gate    : ${result.gate}`);
  console.log(`[normalize] summary : ${result.summary}`);
  return result;
}
