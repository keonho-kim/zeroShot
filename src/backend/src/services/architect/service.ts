import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode, type ThreadEvent, type ThreadOptions } from "@openai/codex-sdk";
import { buildArchitectPrompt } from "@backend/llm/architect/prompt";
import { buildArchitectProductHtmlPrompt } from "@backend/llm/architect/product-html-prompt";
import { ensureDevelopmentLanguageDecision } from "@backend/llm/architect/development-stack-decision";
import { compactVisibleContext, streamVisibleCodexPrelude, visiblePreludePrompt } from "@backend/services/codex-visible-stream/service";
import { architectEmptyProjectReviewGuidance, architectEmptyProjectToolGuidance } from "@backend/services/architect/const/guidance";
import {
  architectDecisionResponseSchema,
  architectDecisionSchema,
  architectProductHtmlResponseSchema,
  architectProductHtmlSchema,
  type ArchitectDecisionResponse,
  type ArchitectProductFile
} from "@backend/services/architect/const/schemas";
import { extractArchitectChatMessage } from "@backend/services/architect/chat-message";
import { normalizeArchitectDecisions } from "@backend/services/architect/decision-normalizer";
import {
  describeArchitectDecisionProgress,
  describeArchitectProductHtmlProgress,
  type ArchitectProgressEvent
} from "@backend/services/architect/progress";

export type { ArchitectDecisionResponse, ArchitectProductFile, ArchitectProgressEvent };
export { ensureDevelopmentLanguageDecision, extractArchitectChatMessage };

function asReasoningEffort(value: string): ModelReasoningEffort {
  if (value === "minimal" || value === "low" || value === "medium" || value === "high" || value === "xhigh") {
    return value;
  }
  throw new Error(`Unsupported reasoning effort: ${value}`);
}

export async function buildArchitectDecisions(params: {
  projectRoot: string;
  goal: string;
  locale: string;
  reasoning: string;
  model?: string;
  resourceContext?: string;
  additionalDirectories?: string[];
  onProgress?: (event: ArchitectProgressEvent) => void | Promise<void>;
  onMessage?: (message: string) => void | Promise<void>;
  onRaw?: (event: ThreadEvent) => void | Promise<void>;
}): Promise<ArchitectDecisionResponse> {
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

  const visibleWorkNotes = [
    {
      workflow: "ARCHITECT brief review",
      task: [
        "Review the user's product brief and identify the target user, core value, and first user action.",
        "",
        compactVisibleContext(params.goal)
      ].join("\n")
    },
    {
      workflow: "ARCHITECT empty workspace check",
      task: [
        "This ARCHITECT run is for a completely empty project. There are no existing source, README, PRODUCT, ARCHITECT, DESIGN, or package files to inspect.",
        "Do not run local file or directory inspection commands. Continue from the user's brief and external product-planning research.",
        "",
        compactVisibleContext(params.goal)
      ].join("\n")
    },
    {
      workflow: "ARCHITECT decision shaping",
      task: [
        "Turn the brief and workspace context into the main decision axes the user should choose before implementation.",
        "Actively use web search and web page reading to compare existing apps or programs in the same category, then derive product-planning strengths, workflow similarities, and useful implications.",
        "Focus on product workflow, screens, data, stack, persistence, integrations, and validation.",
        "",
        compactVisibleContext(params.goal)
      ].join("\n")
    }
  ];

  for (const workNote of visibleWorkNotes) {
    await streamVisibleCodexPrelude({
      thread: codex.startThread({ ...threadOptions, modelReasoningEffort: "low" satisfies ModelReasoningEffort }),
      prompt: visiblePreludePrompt({
        locale: params.locale,
        workflow: workNote.workflow,
        task: workNote.task,
        toolGuidance: architectEmptyProjectToolGuidance,
        reviewGuidance: architectEmptyProjectReviewGuidance
      }),
      describeProgress: (event) => event.type === "turn.completed" ? null : describeArchitectDecisionProgress(event, params.locale),
      onProgress: params.onProgress,
      onMessage: params.onMessage,
      onRaw: params.onRaw
    });
  }

  const thread = codex.startThread(threadOptions);
  const { events } = await thread.runStreamed(buildArchitectPrompt(params.goal, params.locale, params.resourceContext ?? ""), {
    outputSchema: architectDecisionSchema
  });
  let finalResponse = "";
  let lastMessage = "";

  for await (const event of events) {
    await params.onRaw?.(event);
    const progress = describeArchitectDecisionProgress(event, params.locale);
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
    throw new Error("Codex did not return architect decisions.");
  }

  const parsed = architectDecisionResponseSchema.parse(JSON.parse(finalResponse));
  return normalizeArchitectDecisions(ensureDevelopmentLanguageDecision(parsed, params.goal, params.locale), params.locale);
}

export async function buildArchitectProductHtml(params: {
  projectRoot: string;
  userBrief: string;
  decisionSet: ArchitectDecisionResponse;
  answers: Record<string, string>;
  locale: string;
  reasoning: string;
  model?: string;
  resourceContext?: string;
  additionalDirectories?: string[];
  onProgress?: (event: ArchitectProgressEvent) => void | Promise<void>;
  onMessage?: (message: string) => void | Promise<void>;
  onRaw?: (event: ThreadEvent) => void | Promise<void>;
}): Promise<ArchitectProductFile[]> {
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

  const prompt = buildArchitectProductHtmlPrompt(params);

  await streamVisibleCodexPrelude({
    thread: codex.startThread({ ...threadOptions, modelReasoningEffort: "low" satisfies ModelReasoningEffort }),
    prompt: visiblePreludePrompt({
      locale: params.locale,
      workflow: "ARCHITECT PRODUCT.html",
      toolGuidance: architectEmptyProjectToolGuidance,
      reviewGuidance: architectEmptyProjectReviewGuidance,
      task: [
        "Write the product blueprint HTML from the user's brief and selected decisions.",
        "",
        `User brief:\n${compactVisibleContext(params.userBrief)}`,
        "",
        `Selected answers:\n${compactVisibleContext(JSON.stringify(params.answers, null, 2))}`
      ].join("\n")
    }),
    describeProgress: (event) => describeArchitectProductHtmlProgress(event, params.locale),
    onProgress: params.onProgress,
    onMessage: params.onMessage,
    onRaw: params.onRaw
  });

  const thread = codex.startThread(threadOptions);
  const { events } = await thread.runStreamed(prompt, {
    outputSchema: architectProductHtmlSchema
  });
  let finalResponse = "";
  let lastMessage = "";

  for await (const event of events) {
    await params.onRaw?.(event);
    const progress = describeArchitectProductHtmlProgress(event, params.locale);
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
    throw new Error("Codex did not return PRODUCT.html.");
  }

  const parsed = architectProductHtmlResponseSchema.parse(JSON.parse(finalResponse));
  if (!parsed.files.some((file) => file.path === "ARCHITECT/PRODUCT.html")) {
    throw new Error("Architect product response did not return ARCHITECT/PRODUCT.html.");
  }
  return parsed.files;
}
