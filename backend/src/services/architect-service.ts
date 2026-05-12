import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode, type ThreadEvent } from "@openai/codex-sdk";
import { z } from "zod";

const architectDecisionSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    decisions: {
      type: "array",
      minItems: 2,
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
            minItems: 2,
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
  required: ["title", "summary", "decisions"],
  additionalProperties: false
};

const architectDecisionResponseSchema = z.object({
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
    })).min(2).max(5)
  })).min(2).max(5)
});

export type ArchitectDecisionResponse = z.infer<typeof architectDecisionResponseSchema>;

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

function buildArchitectPrompt(goal: string, locale: string): string {
  return `You are ZeroShot ARCHITECT.

The user is describing a product they want to build. Convert the conversation into a few concrete product decisions that the user must choose before implementation can begin.

Rules:
- Return only JSON matching the provided schema.
- Do not edit files, run commands, or inspect the repository unless it is necessary to understand the workspace.
- Ask for 2 to 5 decisions.
- Each decision must include 2 to 5 mutually exclusive options.
- Options must be concrete product directions, not vague preferences.
- The option productRequirement must be written as an implementation-ready requirement for PRODUCT.html.
- The summary must sound like product copy for the user. Do not mention Codex, JSON, prompts, schemas, or PRODUCT.html in title, summary, decision titles, prompts, labels, or details.
- Do not include "unsure", "autopilot", or fallback options.
- Use ${locale === "ko" ? "Korean" : "English"} for all user-facing text.

User conversation:
${goal}`;
}

function progressText(locale: string, ko: string, en: string): string {
  return locale === "ko" ? ko : en;
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
    return {
      id: `command-${item.id}`,
      title: progressText(locale, "워크스페이스 확인 중", "Checking workspace"),
      detail: `${item.command}${item.status === "failed" ? " failed" : ""}`,
      status: item.status === "failed" ? "failed" : item.status === "completed" ? "completed" : "running"
    };
  }
  if (item.type === "mcp_tool_call") {
    return {
      id: `tool-${item.id}`,
      title: progressText(locale, "도구 실행 중", "Running tool"),
      detail: `${item.server}.${item.tool}`,
      status: item.status === "failed" ? "failed" : item.status === "completed" ? "completed" : "running"
    };
  }
  if (item.type === "web_search") {
    return {
      id: `search-${item.id}`,
      title: progressText(locale, "자료 확인 중", "Checking references"),
      detail: item.query,
      status: event.type === "item.completed" ? "completed" : "running"
    };
  }

  return null;
}

export async function buildArchitectDecisions(params: {
  projectRoot: string;
  goal: string;
  locale: string;
  reasoning: string;
  model?: string;
  onProgress?: (event: ArchitectProgressEvent) => void;
}): Promise<ArchitectDecisionResponse> {
  const codex = new Codex();
  const thread = codex.startThread({
    workingDirectory: params.projectRoot,
    skipGitRepoCheck: true,
    approvalPolicy: "never" satisfies ApprovalMode,
    sandboxMode: "read-only" satisfies SandboxMode,
    modelReasoningEffort: asReasoningEffort(params.reasoning),
    ...(params.model ? { model: params.model } : {})
  });

  const { events } = await thread.runStreamed(buildArchitectPrompt(params.goal, params.locale), {
    outputSchema: architectDecisionSchema
  });
  let finalResponse = "";

  for await (const event of events) {
    const progress = describeProgress(event, params.locale);
    if (progress) {
      params.onProgress?.(progress);
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
  return parsed;
}
