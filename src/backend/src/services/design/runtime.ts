import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode, type ThreadEvent, type ThreadOptions } from "@openai/codex-sdk";
import { loadAppConfig } from "@backend/config/app-config";
import { buildDesignPrompt } from "@backend/llm/makeover/prompt";
import { compactVisibleContext, streamVisibleCodexPrelude, visiblePreludePrompt } from "@backend/services/codex-visible-stream/service";
import { readProductHtml } from "@backend/services/file/service";
import { buildResourcePromptContext } from "@backend/services/resource/service";
import type { DesignProgressEvent, DesignRuntimeMode, DesignRuntimeResponse } from "@backend/types/design";
import { makeoverArchitectOnlyReviewGuidance, makeoverArchitectOnlyToolGuidance } from "@backend/services/design/const/guidance";
import { designRuntimeResponseSchema, designRuntimeSchema } from "@backend/services/design/const/schemas";
import { readArchitectContext } from "@backend/services/design/architect-context";
import { extractDesignChatMessage } from "@backend/services/design/chat-message";
import { composeDesignMarkdown } from "@backend/services/design/markdown";
import { describeDesignRuntimeProgress } from "@backend/services/design/progress";
import { asReasoningEffort } from "@backend/services/design/reasoning";

export async function buildDesignRuntime(params: {
  projectRoot: string;
  mode: DesignRuntimeMode;
  goal: string;
  locale: string;
  activeSkillId?: string;
  activeDesignTemplateId?: string;
  activeDesignSystemId?: string;
  model?: string;
  onProgress?: (event: DesignProgressEvent) => void | Promise<void>;
  onMessage?: (message: string) => void | Promise<void>;
  onRaw?: (event: ThreadEvent) => void | Promise<void>;
}): Promise<DesignRuntimeResponse> {
  const appConfig = await loadAppConfig();
  const productHtml = await readProductHtml(params.projectRoot).catch(() => "");
  const architectContext = await readArchitectContext(params.projectRoot).catch(() => "");
  const resourceContext = await buildResourcePromptContext({
    activeSkillId: params.activeSkillId,
    activeDesignTemplateId: params.activeDesignTemplateId,
    activeDesignSystemId: params.activeDesignSystemId,
    includeCatalogSummary: true
  });

  const codex = new Codex();
  const threadOptions = {
    workingDirectory: params.projectRoot,
    skipGitRepoCheck: true,
    approvalPolicy: "never" satisfies ApprovalMode,
    sandboxMode: "read-only" satisfies SandboxMode,
    modelReasoningEffort: asReasoningEffort(appConfig.defaults.planReasoning),
    additionalDirectories: [appConfig.resourceRoots.skills, appConfig.resourceRoots.designTemplates, appConfig.resourceRoots.designSystems],
    ...(params.model ? { model: params.model } : {})
  } satisfies ThreadOptions;

  await streamVisibleCodexPrelude({
    thread: codex.startThread({ ...threadOptions, modelReasoningEffort: "low" satisfies ModelReasoningEffort }),
    prompt: visiblePreludePrompt({
      locale: params.locale,
      workflow: "DESIGN runtime",
      toolGuidance: makeoverArchitectOnlyToolGuidance,
      reviewGuidance: makeoverArchitectOnlyReviewGuidance,
      task: [
        "Generate or revise DESIGN/index.html as an interactive canvas.",
        "",
        `Mode: ${params.mode}`,
        `Goal: ${params.goal}`,
        "",
        `PRODUCT.html:\n${compactVisibleContext(productHtml)}`,
        "",
        `Selected resources:\n${compactVisibleContext(resourceContext)}`
      ].join("\n")
    }),
    describeProgress: (event) => describeDesignRuntimeProgress(event, params.locale),
    onProgress: params.onProgress,
    onMessage: params.onMessage,
    onRaw: params.onRaw
  });

  const thread = codex.startThread(threadOptions);
  const { events } = await thread.runStreamed(buildDesignPrompt({
    mode: params.mode,
    goal: params.goal,
    locale: params.locale,
    productHtml,
    architectContext,
    resourceContext
  }), {
    outputSchema: designRuntimeSchema
  });
  let finalResponse = "";
  let lastMessage = "";

  for await (const event of events) {
    await params.onRaw?.(event);
    const progress = describeDesignRuntimeProgress(event, params.locale);
    if (progress) {
      await params.onProgress?.(progress);
    }
    if ((event.type === "item.updated" || event.type === "item.completed") && event.item.type === "agent_message") {
      const nextMessage = extractDesignChatMessage(event.item.text).trim();
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
    throw new Error("Codex did not return a design runtime response.");
  }

  const parsed = designRuntimeResponseSchema.parse(JSON.parse(finalResponse));
  if (!parsed.files.some((file) => file.path === "DESIGN/index.html")) {
    throw new Error("Design runtime did not return INTERACTIVE CANVAS.");
  }
  const response: DesignRuntimeResponse = {
    id: crypto.randomUUID(),
    projectRoot: params.projectRoot,
    mode: params.mode,
    generatedAt: new Date().toISOString(),
    designMarkdown: "",
    ...parsed
  };
  if (response.chatMessage.trim() && response.chatMessage.trim() !== lastMessage) {
    await params.onMessage?.(response.chatMessage.trim());
  }
  return {
    ...response,
    designMarkdown: composeDesignMarkdown(response)
  };
}
