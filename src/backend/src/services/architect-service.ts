import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode, type ThreadEvent } from "@openai/codex-sdk";
import { z } from "zod";
import { buildArchitectPrompt } from "@backend/llm/architect/prompt.js";
import { buildArchitectProductHtmlPrompt } from "@backend/llm/architect/product-html-prompt.js";
import { ensureDevelopmentLanguageDecision } from "@backend/llm/architect/development-stack-decision.js";
import { textByLocale } from "@backend/i18n/locale.js";

const architectDecisionSchema = {
  type: "object",
  properties: {
    chatMessage: { type: "string" },
    title: { type: "string" },
    summary: { type: "string" },
    decisions: {
      type: "array",
      minItems: 5,
      maxItems: 7,
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

const architectDecisionResponseSchema = z.object({
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
  })).min(5).max(7)
});

export type ArchitectDecisionResponse = z.infer<typeof architectDecisionResponseSchema>;

const architectProductHtmlSchema = {
  type: "object",
  properties: {
    html: { type: "string" }
  },
  required: ["html"],
  additionalProperties: false
};

const architectProductHtmlResponseSchema = z.object({
  html: z.string().trim().min(1)
});

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
    productRequirement: "Use the recommended first option for this decision."
  };
}

function normalizeArchitectDecisions(response: ArchitectDecisionResponse, locale: string): ArchitectDecisionResponse {
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

export interface ArchitectProgressEvent {
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

export { ensureDevelopmentLanguageDecision } from "@backend/llm/architect/development-stack-decision.js";

function progressText(locale: string, ko: string, en: string): string {
  return textByLocale(locale, { ko, en, zh: en, ja: en, es: en, de: en });
}

function decodeJsonStringContent(value: string): string {
  return value
    .replace(/\\\\/g, "\\")
    .replace(/\\"/g, "\"")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

export function extractArchitectChatMessage(raw: string): string {
  const fieldIndex = raw.indexOf("\"chatMessage\"");
  if (fieldIndex < 0) {
    return "";
  }
  const colonIndex = raw.indexOf(":", fieldIndex + "\"chatMessage\"".length);
  if (colonIndex < 0) {
    return "";
  }
  const quoteIndex = raw.indexOf("\"", colonIndex + 1);
  if (quoteIndex < 0) {
    return "";
  }

  let escaped = false;
  let content = "";
  for (let index = quoteIndex + 1; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) {
      content += `\\${char}`;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      try {
        return JSON.parse(`"${content}"`) as string;
      } catch {
        return decodeJsonStringContent(content);
      }
    }
    content += char;
  }

  return decodeJsonStringContent(content);
}

function describeProgress(event: ThreadEvent, locale: string): ArchitectProgressEvent | null {
  if (event.type === "thread.started") {
    return {
      id: "session",
      title: progressText(locale, "제품 분석 세션 시작", "Product analysis started"),
      detail: progressText(locale, "입력한 설명을 제품 기획 흐름으로 넘겼습니다.", "Your brief is being prepared for product planning."),
      status: "completed"
    };
  }
  if (event.type === "turn.started") {
    return {
      id: "analysis",
      title: progressText(locale, "요구사항 분석 중", "Analyzing requirements"),
      detail: progressText(locale, "대상 사용자, 핵심 문제, 필요한 첫 동작을 분리하고 있습니다.", "Identifying the target user, core problem, and first actions."),
      status: "running"
    };
  }
  if (event.type === "turn.completed") {
    return {
      id: "validation",
      title: progressText(locale, "제품 방향 검토 완료", "Product direction reviewed"),
      detail: progressText(
        locale,
        `입력 ${event.usage.input_tokens} 토큰, 출력 ${event.usage.output_tokens} 토큰으로 선택지를 정리했습니다.`,
        `Prepared options using ${event.usage.input_tokens} input tokens and ${event.usage.output_tokens} output tokens.`
      ),
      status: "completed"
    };
  }
  if (event.type === "turn.failed") {
    return {
      id: "failed",
      title: progressText(locale, "제품 방향 정리 실패", "Product planning failed"),
      detail: event.error.message,
      status: "failed"
    };
  }
  if (event.type === "error") {
    return {
      id: "failed",
      title: progressText(locale, "스트림 오류", "Stream error"),
      detail: event.message,
      status: "failed"
    };
  }

  const item = event.item;
  if (item.type === "reasoning") {
    return {
      id: "reasoning",
      title: progressText(locale, "제품 구조 정리 중", "Structuring product decisions"),
      detail: progressText(locale, "설명에서 선택이 필요한 제품 축을 추려내고 있습니다.", "Finding the product choices that need a user decision."),
      status: event.type === "item.completed" ? "completed" : "running"
    };
  }
  if (item.type === "agent_message") {
    return {
      id: "draft",
      title: progressText(locale, "선택지 작성 중", "Writing product options"),
      detail: progressText(locale, "바로 고를 수 있는 제품 선택지와 구현 요구사항을 작성하고 있습니다.", "Writing concrete options and implementation-ready requirements."),
      status: event.type === "item.completed" ? "completed" : "running"
    };
  }
  if (item.type === "command_execution") {
    return null;
  }
  if (item.type === "mcp_tool_call") {
    return null;
  }
  if (item.type === "web_search") {
    return null;
  }

  return null;
}

export async function buildArchitectDecisions(params: {
  projectRoot: string;
  goal: string;
  locale: string;
  reasoning: string;
  model?: string;
  resourceContext?: string;
  additionalDirectories?: string[];
  onProgress?: (event: ArchitectProgressEvent) => void;
  onMessage?: (message: string) => void;
}): Promise<ArchitectDecisionResponse> {
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

  const { events } = await thread.runStreamed(buildArchitectPrompt(params.goal, params.locale, params.resourceContext ?? ""), {
    outputSchema: architectDecisionSchema
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
}): Promise<string> {
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

  const prompt = buildArchitectProductHtmlPrompt(params);

  const { events } = await thread.runStreamed(prompt, {
    outputSchema: architectProductHtmlSchema
  });
  let finalResponse = "";

  for await (const event of events) {
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
  return parsed.html;
}
