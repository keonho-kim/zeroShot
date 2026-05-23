import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode, type ThreadEvent, type ThreadOptions } from "@openai/codex-sdk";
import { loadAppConfig } from "@backend/config/app-config";
import { buildRecommendationPrompt } from "@backend/llm/makeover/recommendation-prompt";
import { compactVisibleContext, streamVisibleCodexPrelude, visiblePreludePrompt } from "@backend/services/codex-visible-stream-service";
import { readProductHtml } from "@backend/services/file-service";
import { listResourceCatalog } from "@backend/services/resource-service";
import { type DesignProgressEvent, type DesignRecommendationResponse } from "@backend/types/design";
import type { ResourceManifest } from "@backend/types/resource";
import { makeoverArchitectOnlyReviewGuidance, makeoverArchitectOnlyToolGuidance } from "@backend/services/design/const/guidance";
import { designRecommendationResponseSchema, designRecommendationSchema } from "@backend/services/design/const/schemas";
import { readArchitectContext } from "@backend/services/design/architect-context";
import { extractDesignChatMessage } from "@backend/services/design/chat-message";
import { describeDesignRecommendationProgress } from "@backend/services/design/progress";
import { asReasoningEffort } from "@backend/services/design/reasoning";

function assertResourceIds(kind: string, selectedIds: string[], resources: ResourceManifest[]): void {
  const available = new Set(resources.map((resource) => resource.id));
  const invalid = selectedIds.filter((id) => !available.has(id));
  if (invalid.length) {
    throw new Error(`${kind} recommendation used unknown resourceId: ${invalid.join(", ")}`);
  }
}

export function validateDesignRecommendations(
  response: unknown,
  catalog: { designTemplates: ResourceManifest[]; designSystems: ResourceManifest[] }
): DesignRecommendationResponse {
  const parsed = designRecommendationResponseSchema.parse(response);
  assertResourceIds("Design system", parsed.designSystems.map((option) => option.resourceId), catalog.designSystems);
  assertResourceIds("Design template", parsed.designTemplates.map((option) => option.resourceId), catalog.designTemplates);
  return parsed;
}

export async function recommendDesignResources(params: {
  projectRoot: string;
  locale: string;
  model?: string;
  onProgress?: (event: DesignProgressEvent) => void | Promise<void>;
  onMessage?: (message: string) => void | Promise<void>;
  onRaw?: (event: ThreadEvent) => void | Promise<void>;
}): Promise<DesignRecommendationResponse> {
  const appConfig = await loadAppConfig();
  const productHtml = await readProductHtml(params.projectRoot).catch(() => "");
  const architectContext = await readArchitectContext(params.projectRoot).catch(() => "");
  const catalog = await listResourceCatalog();

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
      workflow: "DESIGN recommendation",
      toolGuidance: makeoverArchitectOnlyToolGuidance,
      reviewGuidance: makeoverArchitectOnlyReviewGuidance,
      task: [
        "Recommend design systems and templates for the current product blueprint.",
        "",
        `PRODUCT.html:\n${compactVisibleContext(productHtml)}`,
        "",
        `ARCHITECT context:\n${compactVisibleContext(architectContext)}`
      ].join("\n")
    }),
    describeProgress: (event) => describeDesignRecommendationProgress(event, params.locale),
    onProgress: params.onProgress,
    onMessage: params.onMessage,
    onRaw: params.onRaw
  });

  const thread = codex.startThread(threadOptions);
  const { events } = await thread.runStreamed(buildRecommendationPrompt({
    locale: params.locale,
    productHtml,
    architectContext,
    catalog
  }), {
    outputSchema: designRecommendationSchema
  });
  let finalResponse = "";
  let lastMessage = "";

  for await (const event of events) {
    await params.onRaw?.(event);
    const progress = describeDesignRecommendationProgress(event, params.locale);
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
    throw new Error("Codex did not return design recommendations.");
  }

  const recommendations = validateDesignRecommendations(JSON.parse(finalResponse), catalog);
  if (recommendations.chatMessage.trim() && recommendations.chatMessage.trim() !== lastMessage) {
    await params.onMessage?.(recommendations.chatMessage.trim());
  }
  return recommendations;
}
