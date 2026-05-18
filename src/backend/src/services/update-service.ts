import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode, type ThreadEvent } from "@openai/codex-sdk";
import { z } from "zod";
import { extractArchitectChatMessage, type ArchitectDecisionResponse } from "@backend/services/architect-service.js";
import { languageName, textByLocale } from "@backend/i18n/locale.js";

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
            maxItems: 6,
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
    })).min(5).max(6)
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

function omakaseOption(locale: string): ArchitectDecisionResponse["decisions"][number]["options"][number] {
  return {
    id: "omakase",
    label: textByLocale(locale, {
      ko: "알아서 해주세요",
      en: "Let Codex choose",
      zh: "让 Codex 决定",
      ja: "Codex に任せる",
      es: "Que Codex elija",
      de: "Codex entscheiden lassen"
    }),
    detail: textByLocale(locale, {
      ko: "Codex 추천안을 그대로 사용합니다.",
      en: "Use the recommended option as-is.",
      zh: "直接使用推荐方案。",
      ja: "おすすめの案をそのまま使います。",
      es: "Usar la opción recomendada tal cual.",
      de: "Die empfohlene Option unverändert verwenden."
    }),
    productRequirement: "Use the recommended first option for this update decision."
  };
}

function normalizeUpdateDecisions(response: UpdateDecisionResponse, locale: string): UpdateDecisionResponse {
  return {
    ...response,
    decisions: response.decisions.map((decision) => {
      const concreteOptions = decision.options
        .filter((option) => option.id !== "omakase")
        .slice(0, 5);
      return {
        ...decision,
        options: [...concreteOptions, omakaseOption(locale)]
      };
    })
  };
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
      detail: progressText(
        locale,
        `입력 ${event.usage.input_tokens} 토큰, 출력 ${event.usage.output_tokens} 토큰으로 질문을 정리했습니다.`,
        `Prepared questions using ${event.usage.input_tokens} input tokens and ${event.usage.output_tokens} output tokens.`
      ),
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
  if ((event.type === "item.updated" || event.type === "item.completed") && event.item.type === "agent_message") {
    return {
      id: "options",
      title: progressText(locale, "선택지 작성 중", "Writing update options"),
      detail: progressText(locale, "바로 선택할 수 있는 업데이트 방향을 작성하고 있습니다.", "Writing concrete update directions."),
      status: event.type === "item.completed" ? "completed" : "running"
    };
  }
  return null;
}

function buildUpdatePrompt(updateRequest: string, locale: string): string {
  const language = languageName(locale);
  return `You are ZeroShot UPDATE.

The user wants to modify an existing built product. Convert the request into concrete update decisions the user should answer before implementation starts.

Rules:
- Return only JSON matching the provided schema.
- Do not edit files or run commands.
- Read PRODUCT.html and inspect the repository only if needed to understand the current product and source shape.
- Ask 3 to 5 concrete decisions.
- Each decision must include exactly 6 mutually exclusive options.
- The first option must be the option Codex recommends.
- Options 2 through 5 must be credible alternatives.
- Option 6 must be "알아서 해주세요" in Korean or "Let Codex choose" in English, and it must mean "use the recommended first option".
- Decisions should clarify update scope, UX/product behavior, implementation risk, testing expectations, and PRODUCT.html spec impact.
- Every option productRequirement must be implementation-ready for UPDATE.md and later pipeline work.
- Include a requirement that the update run executes relevant tests and cross-checks the final implementation against PRODUCT.html feature specifications.
- Use ${language} for all user-facing text.
- Return JSON with chatMessage as the first field. chatMessage must be a concise user-facing progress/summary sentence that can be streamed while UPDATE is working.

User update request:
${updateRequest}`;
}

export async function buildUpdateDecisions(params: {
  projectRoot: string;
  updateRequest: string;
  locale: string;
  reasoning: string;
  model?: string;
  additionalDirectories?: string[];
  onProgress?: (event: UpdateProgressEvent) => void;
  onMessage?: (message: string) => void;
}): Promise<UpdateDecisionResponse> {
  const codex = new Codex();
  const thread = codex.startThread({
    workingDirectory: params.projectRoot,
    skipGitRepoCheck: true,
    approvalPolicy: "never" satisfies ApprovalMode,
    sandboxMode: "read-only" satisfies SandboxMode,
    modelReasoningEffort: asReasoningEffort(params.reasoning),
    additionalDirectories: params.additionalDirectories ?? [],
    ...(params.model ? { model: params.model } : {})
  });

  const { events } = await thread.runStreamed(buildUpdatePrompt(params.updateRequest, params.locale), {
    outputSchema: updateDecisionSchema
  });
  let finalResponse = "";
  let lastMessage = "";

  for await (const event of events) {
    const progress = describeProgress(event, params.locale);
    if (progress) {
      params.onProgress?.(progress);
    }
    if ((event.type === "item.updated" || event.type === "item.completed") && event.item.type === "agent_message") {
      const nextMessage = extractArchitectChatMessage(event.item.text).trim();
      if (nextMessage && nextMessage !== lastMessage) {
        lastMessage = nextMessage;
        params.onMessage?.(nextMessage);
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
  return normalizeUpdateDecisions(parsed, params.locale);
}
