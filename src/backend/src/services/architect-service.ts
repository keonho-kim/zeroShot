import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode, type ThreadEvent, type ThreadOptions } from "@openai/codex-sdk";
import { z } from "zod";
import { buildArchitectPrompt } from "@backend/llm/architect/prompt";
import { buildArchitectProductHtmlPrompt } from "@backend/llm/architect/product-html-prompt";
import { ensureDevelopmentLanguageDecision } from "@backend/llm/architect/development-stack-decision";
import { textByLocale } from "@backend/i18n/locale";
import { describeCodexProgress } from "@backend/services/codex-progress-service";
import { compactVisibleContext, streamVisibleCodexPrelude, visiblePreludePrompt } from "@backend/services/codex-visible-stream-service";

const architectEmptyProjectToolGuidance = [
  "This ARCHITECT workflow is for a completely empty project.",
  "Do not inspect local workspace files, browse local directories, or run local file/search commands such as pwd, ls, find, rg, cat, sed, head, or tree.",
  "There are no existing source files, README files, PRODUCT/ARCHITECT/DESIGN files, or package metadata to review.",
  "Use the user's brief directly, and actively use web search or web page reading when external product-planning context can improve the decisions."
].join(" ");

const architectEmptyProjectReviewGuidance = "Describe the user brief, external product references, workflow similarities, product-planning strengths, or decision axis you reviewed. Do not mention local files or workspace inspection.";

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
    chatMessage: { type: "string" },
    files: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          type: { type: "string" },
          title: { type: "string" },
          content: { type: "string" }
        },
        required: ["path", "type", "title", "content"],
        additionalProperties: false
      }
    }
  },
  required: ["chatMessage", "files"],
  additionalProperties: false
};

const architectProductHtmlResponseSchema = z.object({
  chatMessage: z.string().trim().min(1),
  files: z.array(z.object({
    path: z.string().trim().min(1),
    type: z.string().trim().min(1),
    title: z.string().trim().min(1),
    content: z.string().trim().min(1)
  })).min(1).max(8)
});

export type ArchitectProductFile = z.infer<typeof architectProductHtmlResponseSchema>["files"][number];

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

export { ensureDevelopmentLanguageDecision } from "@backend/llm/architect/development-stack-decision";

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
      detail: progressText(locale, "사용자가 고를 수 있는 제품 방향 선택지를 정리했습니다.", "Prepared the product direction options."),
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

  return describeCodexProgress(event, locale, {
    reasoningTitle: progressText(locale, "제품 선택 기준 검토", "Reviewing product decision criteria"),
    reasoningDetail: progressText(locale, "입력 설명에서 사용자를 나누고 선택이 필요한 제품 축을 추리고 있습니다.", "Separating users from the brief and finding product axes that need a decision."),
    agentTitle: progressText(locale, "선택지 응답 작성", "Writing product options"),
    agentDetail: progressText(locale, "사용자가 바로 고를 수 있는 선택지와 구현 요구사항을 JSON 응답으로 작성하고 있습니다.", "Writing selectable options and implementation requirements into the JSON response.")
  });
}

function describeProductHtmlProgress(event: ThreadEvent, locale: string): ArchitectProgressEvent | null {
  if (event.type === "thread.started") {
    return {
      id: "product-session",
      title: progressText(locale, "PRODUCT.html 생성 시작", "PRODUCT.html generation started"),
      detail: progressText(locale, "선택한 답변과 제품 방향을 문서 작성 작업으로 넘겼습니다.", "Your choices and product direction are being prepared for the document."),
      status: "completed"
    };
  }
  if (event.type === "turn.started") {
    return {
      id: "product-writing",
      title: progressText(locale, "제품 블루프린트 작성 중", "Writing the product blueprint"),
      detail: progressText(locale, "제품 구조, 핵심 기능, 화면 흐름을 PRODUCT.html로 정리하고 있습니다.", "Organizing product structure, core features, and screen flows into PRODUCT.html."),
      status: "running"
    };
  }
  if (event.type === "turn.completed") {
    return {
      id: "product-validation",
      title: progressText(locale, "PRODUCT.html 검토 완료", "PRODUCT.html reviewed"),
      detail: progressText(locale, "제품 블루프린트 문서를 작성하고 결과를 검토했습니다.", "Prepared and reviewed the product blueprint document."),
      status: "completed"
    };
  }
  if (event.type === "turn.failed") {
    return {
      id: "product-failed",
      title: progressText(locale, "PRODUCT.html 생성 실패", "PRODUCT.html generation failed"),
      detail: event.error.message,
      status: "failed"
    };
  }
  if (event.type === "error") {
    return {
      id: "product-failed",
      title: progressText(locale, "스트림 오류", "Stream error"),
      detail: event.message,
      status: "failed"
    };
  }

  return describeCodexProgress(event, locale, {
    reasoningTitle: progressText(locale, "제품 문서 구조 설계", "Structuring the product document"),
    reasoningDetail: progressText(locale, "선택한 답변을 기능 명세, 화면 흐름, 수용 기준 섹션으로 나누고 있습니다.", "Turning selected answers into feature specs, screen flows, and acceptance criteria."),
    agentTitle: progressText(locale, "PRODUCT.html 응답 작성", "Writing PRODUCT.html response"),
    agentDetail: progressText(locale, "DESIGN과 BUILD가 참고할 제품 블루프린트 HTML과 상태 메시지를 작성하고 있습니다.", "Writing the product blueprint HTML and status message for Design and Build.")
  });
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
      describeProgress: (event) => event.type === "turn.completed" ? null : describeProgress(event, params.locale),
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
    describeProgress: (event) => describeProductHtmlProgress(event, params.locale),
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
    const progress = describeProductHtmlProgress(event, params.locale);
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
