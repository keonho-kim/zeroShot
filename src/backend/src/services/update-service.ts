import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode, type ThreadEvent, type ThreadOptions } from "@openai/codex-sdk";
import { z } from "zod";
import { extractArchitectChatMessage } from "@backend/services/architect-service";
import { buildUpdatePrompt } from "@backend/llm/update/prompt";
import { textByLocale } from "@backend/i18n/locale";
import { describeCodexProgress } from "@backend/services/codex-progress-service";
import { streamVisibleCodexPrelude, visiblePreludePrompt } from "@backend/services/codex-visible-stream-service";

const updateDecisionSchema = {
  type: "object",
  properties: {
    chatMessage: { type: "string" },
    title: { type: "string" },
    summary: { type: "string" },
    decisions: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          prompt: { type: "string" },
          section: { type: "string" },
          options: {
            type: "array",
            minItems: 5,
            maxItems: 5,
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                label: { type: "string" },
                detail: { type: "string" },
                productRequirement: { type: "string" }
              },
              required: ["id", "label", "detail", "productRequirement"],
              additionalProperties: false
            }
          }
        },
        required: ["id", "title", "prompt", "section", "options"],
        additionalProperties: false
      }
    }
  },
  required: ["chatMessage", "title", "summary", "decisions"],
  additionalProperties: false
};

const updateDecisionResponseSchema = z.object({
  chatMessage: z.string().trim().min(1),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  decisions: z.array(z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    prompt: z.string().trim().min(1),
    section: z.string().trim().min(1),
    options: z.array(z.object({
      id: z.string().trim().min(1),
      label: z.string().trim().min(1),
      detail: z.string().trim().min(1),
      productRequirement: z.string().trim().min(1)
    })).length(5)
  })).min(3).max(5)
});

export type UpdateDecisionResponse = z.infer<typeof updateDecisionResponseSchema>;

export interface UpdateProgressEvent {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
}

function asReasoningEffort(value: string): ModelReasoningEffort {
  if (value === "minimal" || value === "low" || value === "medium" || value === "high" || value === "xhigh") {
    return value;
  }
  throw new Error(`Unsupported reasoning effort: ${value}`);
}

function progressText(locale: string, ko: string, en: string): string {
  return textByLocale(locale, { ko, en, zh: en, ja: en, es: en, de: en });
}

export function validateConcreteUpdateDecisions(response: UpdateDecisionResponse): UpdateDecisionResponse {
  for (const decision of response.decisions) {
    if (decision.options.some((option) => option.id === "omakase")) {
      throw new Error("UPDATE decisions must not include Codex self-selection options.");
    }
  }
  return response;
}

function describeProgress(event: ThreadEvent, locale: string): UpdateProgressEvent | null {
  if (event.type === "thread.started") {
    return {
      id: "session",
      title: progressText(locale, "업데이트 분석 시작", "Update analysis started"),
      detail: progressText(locale, "요청을 PRODUCT와 현재 소스 기준으로 검토합니다.", "Reviewing the request against PRODUCT and current source."),
      status: "completed"
    };
  }
  if (event.type === "turn.started") {
    return {
      id: "analysis",
      title: progressText(locale, "업데이트 질문 정리 중", "Preparing update questions"),
      detail: progressText(locale, "변경 범위, 검증 방법, 기능 명세 반영 여부를 분리하고 있습니다.", "Separating scope, validation, and product spec impact."),
      status: "running"
    };
  }
  if (event.type === "turn.completed") {
    return {
      id: "validation",
      title: progressText(locale, "업데이트 선택지 준비 완료", "Update choices prepared"),
      detail: progressText(locale, "변경 범위를 고를 수 있도록 업데이트 질문을 정리했습니다.", "Prepared update questions for choosing the change scope."),
      status: "completed"
    };
  }
  if (event.type === "turn.failed") {
    return {
      id: "failed",
      title: progressText(locale, "업데이트 질문 생성 실패", "Update question generation failed"),
      detail: event.error.message,
      status: "failed"
    };
  }
  if (event.type === "error") {
    return {
      id: "error",
      title: progressText(locale, "업데이트 질문 생성 오류", "Update question generation error"),
      detail: event.message,
      status: "failed"
    };
  }
  return describeCodexProgress(event, locale, {
    reasoningTitle: progressText(locale, "업데이트 범위 검토", "Reviewing update scope"),
    reasoningDetail: progressText(locale, "요청이 바꾸는 기능, 검증 방법, PRODUCT 반영 여부를 분리하고 있습니다.", "Separating changed features, validation needs, and PRODUCT spec impact."),
    agentTitle: progressText(locale, "업데이트 선택지 응답 작성", "Writing update choices"),
    agentDetail: progressText(locale, "사용자가 고를 수 있는 업데이트 방향과 후속 실행 기준을 JSON 응답으로 작성하고 있습니다.", "Writing selectable update directions and execution criteria into the JSON response.")
  });
}

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
    describeProgress: (event) => describeProgress(event, params.locale),
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
    const progress = describeProgress(event, params.locale);
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
