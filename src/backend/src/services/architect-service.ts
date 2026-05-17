import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode, type ThreadEvent } from "@openai/codex-sdk";
import { z } from "zod";
import { buildArchitectPrompt } from "@backend/prompts/architect/decision-prompt.js";
import { ensureDevelopmentLanguageDecision } from "@backend/prompts/architect/development-stack-decision.js";

const architectDecisionSchema = {
  type: "object",
  properties: {
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
  return locale === "ko"
    ? {
      id: "omakase",
      label: "알아서 해주세요",
      detail: "Codex 추천안을 그대로 사용합니다.",
      productRequirement: "Use the recommended first option for this decision."
    }
    : {
      id: "omakase",
      label: "Let Codex choose",
      detail: "Use the recommended option as-is.",
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

export { ensureDevelopmentLanguageDecision } from "@backend/prompts/architect/development-stack-decision.js";

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
  const selectedRequirements = params.decisionSet.decisions.map((decision) => {
    const answerId = params.answers[decision.id];
    const selected = decision.options.find((option) => option.id === answerId) ?? decision.options[0];
    return [
      `Question: ${decision.title}`,
      `Selected: ${selected?.label ?? "Not selected"}`,
      `Requirement: ${selected?.productRequirement ?? selected?.detail ?? ""}`
    ].join("\n");
  }).join("\n\n");

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

  const prompt = [
    "Create ARCHITECT/PRODUCT.html for this ZeroShot project.",
    "",
    "Return only JSON matching the schema. The html field must contain a complete interactive HTML document.",
    "Do not create files or run commands. Do not return Markdown.",
    "The HTML must be a product planning document, not implementation code. It should be useful later for DESIGN, BUILD, and UPDATE.",
    "Use self-contained CSS and lightweight JavaScript only when it improves interactive review.",
    "Use compact 80% density in the generated planning document: smaller controls, tighter section spacing, shorter cards, and restrained heading scale while keeping the document readable.",
    "Include product concept, target users, key workflows, core screens, data model, integrations, build constraints, and acceptance criteria.",
    "Write user-facing content in the requested locale.",
    "",
    `Locale: ${params.locale}`,
    "",
    "Initial user brief:",
    params.userBrief,
    "",
    "Selected architect decisions:",
    selectedRequirements,
    "",
    params.resourceContext ? ["Active resources:", params.resourceContext].join("\n") : ""
  ].filter(Boolean).join("\n");

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
