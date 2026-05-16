import type { PipelineContext } from "@cli/pipeline/types.js";
import { nowHuman } from "@cli/pipeline/utils.js";
import { additionalDirectoryBlock, commonContractBlock, compactStateBlock, updateInputFileBlock } from "@cli/pipeline/phase/common/prompt-blocks.js";

export function buildPrompt(ctx: PipelineContext, phase: string, reasoning: string, goalText: string, extraContext: string): string {
  return `Repository root: ${ctx.projectRoot}
Run mode: ${ctx.mode}
Product file: ${ctx.productFile}
Run directory for final user HTML only: ${ctx.runDir}
Run name: ${ctx.runName}
Current phase: ${phase}
Current time: ${nowHuman()}
Requested reasoning effort: ${reasoning}
Response language: ${ctx.options.responseLanguage}

Read if needed:
- ${ctx.productFile}
- ${ctx.projectRoot}/.agents/PROJECT_CONTEXT.md

${updateInputFileBlock(ctx)}

${additionalDirectoryBlock(ctx)}

${compactStateBlock(ctx)}

${commonContractBlock(ctx)}

Phase-specific goal:
${goalText}

Additional execution context:
${extraContext}

Pipeline note:
${ctx.pipelineNote || "none"}

Return only a JSON object matching the provided output schema.`;
}
