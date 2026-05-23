import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode, type ThreadEvent, type ThreadOptions } from "@openai/codex-sdk";
import { extractArchitectChatMessage } from "@backend/services/architect/service";
import { buildUpdatePrompt } from "@backend/llm/update/prompt";
import { streamVisibleCodexPrelude, visiblePreludePrompt } from "@backend/services/codex-visible-stream/service";
import {
  updateDecisionResponseSchema,
  updateDecisionSchema,
  type UpdateDecisionResponse
} from "@backend/services/update/const/schemas";
import { describeUpdateProgress } from "@backend/services/update/progress";
import { asReasoningEffort } from "@backend/services/update/reasoning";
import type { UpdateProgressEvent } from "@backend/services/update/types";
import { validateConcreteUpdateDecisions } from "@backend/services/update/validation";

export type { UpdateDecisionResponse, UpdateProgressEvent };
export { validateConcreteUpdateDecisions };

export async function buildUpdateDecisions(params: {
  projectRoot: string;
  updateRequest: string;
  locale: string;
  reasoning: string;
  model?: string;
  additionalDirectories?: string[];
  onProgress?: (event: UpdateProgressEvent) => void | Promise<void>;
  onMessage?: (message: string) => void | Promise<void>;
  onRaw?: (event: ThreadEvent) => void | Promise<void>;
}): Promise<UpdateDecisionResponse> {
  const codex = new Codex();
  const threadOptions = {
    workingDirectory: params.projectRoot,
    skipGitRepoCheck: true,
    approvalPolicy: "never" satisfies ApprovalMode,
    sandboxMode: "read-only" satisfies SandboxMode,
    modelReasoningEffort: asReasoningEffort(params.reasoning),
    additionalDirectories: params.additionalDirectories ?? [],
    ...(params.model ? { model: params.model } : {})
  } satisfies ThreadOptions;

  await streamVisibleCodexPrelude({
    thread: codex.startThread({ ...threadOptions, modelReasoningEffort: "low" satisfies ModelReasoningEffort }),
    prompt: visiblePreludePrompt({
      locale: params.locale,
      workflow: "UPDATE",
      task: [
        "Create follow-up questions for this update request.",
        "",
        params.updateRequest
      ].join("\n")
    }),
    describeProgress: (event) => describeUpdateProgress(event, params.locale),
    onProgress: params.onProgress,
    onMessage: params.onMessage,
    onRaw: params.onRaw
  });

  const thread = codex.startThread(threadOptions);
  const { events } = await thread.runStreamed(buildUpdatePrompt(params.updateRequest, params.locale), {
    outputSchema: updateDecisionSchema
  });
  let finalResponse = "";
  let lastMessage = "";

  for await (const event of events) {
    await params.onRaw?.(event);
    const progress = describeUpdateProgress(event, params.locale);
    if (progress) {
      await params.onProgress?.(progress);
    }
    if ((event.type === "item.updated" || event.type === "item.completed") && event.item.type === "agent_message") {
      const nextMessage = extractArchitectChatMessage(event.item.text).trim();
      if (nextMessage && nextMessage !== lastMessage) {
        lastMessage = nextMessage;
        await params.onMessage?.(nextMessage);
      }
    }
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
    throw new Error("Codex did not return update decisions.");
  }

  const parsed = updateDecisionResponseSchema.parse(JSON.parse(finalResponse));
  return validateConcreteUpdateDecisions(parsed);
}
