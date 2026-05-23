import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode, type ThreadEvent, type ThreadOptions } from "@openai/codex-sdk";
import { z } from "zod";
import { loadAppConfig } from "@backend/config/app-config.js";
import { buildDesignPrompt, modeDisplayName } from "@backend/llm/makeover/prompt.js";
import { buildRecommendationPrompt } from "@backend/llm/makeover/recommendation-prompt.js";
import { textByLocale } from "@backend/i18n/locale.js";
import { describeCodexProgress } from "@backend/services/codex-progress-service.js";
import { compactVisibleContext, streamVisibleCodexPrelude, visiblePreludePrompt } from "@backend/services/codex-visible-stream-service.js";
import { architectProductPath, readProductHtml } from "@backend/services/file-service.js";
import { buildResourcePromptContext, listResourceCatalog } from "@backend/services/resource-service.js";
import type {
  DesignRecommendationResponse,
  DesignProgressEvent,
  DesignRuntimeMode,
  DesignRuntimeResponse
} from "@backend/types/design.js";
import type { ResourceManifest } from "@backend/types/resource.js";

const makeoverArchitectOnlyToolGuidance = [
  "Use read-only tools only when they help inspect ARCHITECT/PRODUCT.html, supporting files under ARCHITECT/, or selected read-only resource roots.",
  "Do not inspect bootstrap scaffold, source code, DESIGN output, runs, or unrelated project folders.",
  "Use web search or web page reading only when external product or UI references would improve the recommendation or runtime design."
].join(" ");

const makeoverArchitectOnlyReviewGuidance = "Describe the ARCHITECT product plan, selected resources, comparable product references, or design decision axis you reviewed. Do not mention bootstrap scaffold or source code.";

const designRuntimeSchema = {
  type: "object",
  properties: {
    chatMessage: { type: "string" },
    title: { type: "string" },
    summary: { type: "string" },
    sections: {
      type: "array",
      minItems: 3,
      maxItems: 7,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          body: { type: "string" }
        },
        required: ["id", "title", "body"],
        additionalProperties: false
      }
    },
    actions: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          detail: { type: "string" },
          owner: { type: "string", enum: ["codex", "designer", "reviewer"] }
        },
        required: ["label", "detail", "owner"],
        additionalProperties: false
      }
    },
    artifacts: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          type: { type: "string" },
          title: { type: "string" },
          description: { type: "string" }
        },
        required: ["path", "type", "title", "description"],
        additionalProperties: false
      }
    },
    files: {
      type: "array",
      minItems: 1,
      maxItems: 6,
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
  required: ["chatMessage", "title", "summary", "sections", "actions", "artifacts", "files"],
  additionalProperties: false
};

const designRuntimeResponseSchema = z.object({
  chatMessage: z.string().trim().min(1),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  sections: z.array(z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    body: z.string().trim().min(1)
  })).min(3).max(7),
  actions: z.array(z.object({
    label: z.string().trim().min(1),
    detail: z.string().trim().min(1),
    owner: z.enum(["codex", "designer", "reviewer"])
  })).min(3).max(8),
  artifacts: z.array(z.object({
    path: z.string().trim().min(1),
    type: z.string().trim().min(1),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1)
  })).min(2).max(6),
  files: z.array(z.object({
    path: z.string().trim().min(1),
    type: z.string().trim().min(1),
    title: z.string().trim().min(1),
    content: z.string().trim().min(1)
  })).min(1).max(6)
});

const designRecommendationSchema = {
  type: "object",
  properties: {
    chatMessage: { type: "string" },
    title: { type: "string" },
    summary: { type: "string" },
    designSystems: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          resourceId: { type: "string" },
          label: { type: "string" },
          detail: { type: "string" },
          reason: { type: "string" }
        },
        required: ["id", "resourceId", "label", "detail", "reason"],
        additionalProperties: false
      }
    },
    designTemplates: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          resourceId: { type: "string" },
          label: { type: "string" },
          detail: { type: "string" },
          reason: { type: "string" }
        },
        required: ["id", "resourceId", "label", "detail", "reason"],
        additionalProperties: false
      }
    }
  },
  required: ["chatMessage", "title", "summary", "designSystems", "designTemplates"],
  additionalProperties: false
};

const designRecommendationResponseSchema = z.object({
  chatMessage: z.string().trim().min(1),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  designSystems: z.array(z.object({
    id: z.string().trim().min(1),
    resourceId: z.string().trim().min(1),
    label: z.string().trim().min(1),
    detail: z.string().trim().min(1),
    reason: z.string().trim().min(1)
  })).length(5),
  designTemplates: z.array(z.object({
    id: z.string().trim().min(1),
    resourceId: z.string().trim().min(1),
    label: z.string().trim().min(1),
    detail: z.string().trim().min(1),
    reason: z.string().trim().min(1)
  })).length(5)
});

function asReasoningEffort(value: string): ModelReasoningEffort {
  if (value === "minimal" || value === "low" || value === "medium" || value === "high" || value === "xhigh") {
    return value;
  }
  throw new Error(`Unsupported reasoning effort: ${value}`);
}

function progressText(locale: string, ko: string, en: string): string {
  return textByLocale(locale, { ko, en, zh: en, ja: en, es: en, de: en });
}

function designArtifactDisplayPath(path: string): string {
  return path === "DESIGN/index.html" ? "INTERACTIVE CANVAS" : path;
}

function decodeJsonStringContent(value: string): string {
  return value
    .replace(/\\\\/g, "\\")
    .replace(/\\"/g, "\"")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

export function extractDesignChatMessage(raw: string): string {
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

function describeProgress(event: ThreadEvent, locale: string): DesignProgressEvent | null {
  if (event.type === "thread.started") {
    return {
      id: "session",
      title: progressText(locale, "분석 중", "Analyzing"),
      detail: progressText(locale, "제품 설계와 선택 리소스를 디자인 작업대로 넘겼습니다.", "Product direction and selected resources are entering the design workbench."),
      status: "completed"
    };
  }
  if (event.type === "turn.started") {
    return {
      id: "analysis",
      title: progressText(locale, "분석 중", "Analyzing"),
      detail: progressText(locale, "제품 블루프린트, 디자인 템플릿, 편집 모드를 정리하고 있습니다.", "Reading the product blueprint, design template, and editing mode."),
      status: "running"
    };
  }
  if (event.type === "turn.completed") {
    return {
      id: "complete",
      title: progressText(locale, "완료", "Done"),
      detail: progressText(locale, "INTERACTIVE CANVAS로 저장할 DESIGN 산출물을 준비했습니다.", "Prepared the DESIGN artifact for INTERACTIVE CANVAS."),
      status: "completed"
    };
  }
  if (event.type === "turn.failed") {
    return {
      id: "failed",
      title: progressText(locale, "실패", "Failed"),
      detail: event.error.message,
      status: "failed"
    };
  }
  if (event.type === "error") {
    return {
      id: "failed",
      title: progressText(locale, "실패", "Failed"),
      detail: event.message,
      status: "failed"
    };
  }

  return describeCodexProgress(event, locale, {
    reasoningTitle: progressText(locale, "캔버스 변경 범위 검토", "Reviewing canvas change scope"),
    reasoningDetail: progressText(locale, "PRODUCT, 선택 리소스, 사용자 요청을 기준으로 수정할 화면 구조를 나누고 있습니다.", "Separating the target screen structure from PRODUCT, selected resources, and the user request."),
    agentTitle: progressText(locale, "INTERACTIVE CANVAS 응답 작성", "Writing INTERACTIVE CANVAS response"),
    agentDetail: progressText(locale, "DESIGN/index.html과 사용자에게 보여줄 상태 메시지를 JSON 응답으로 작성하고 있습니다.", "Writing DESIGN/index.html and the user-facing status message into the JSON response.")
  });
}

function describeRecommendationProgress(event: ThreadEvent, locale: string): DesignProgressEvent | null {
  if (event.type === "thread.started") {
    return {
      id: "session",
      title: progressText(locale, "디자인 추천 세션 시작", "Design recommendation started"),
      detail: progressText(locale, "제품 기획서와 로컬 디자인 자산을 추천 작업에 넘겼습니다.", "Product planning and local design resources are ready for recommendation."),
      status: "completed"
    };
  }
  if (event.type === "turn.started") {
    return {
      id: "analysis",
      title: progressText(locale, "디자인 후보 정리 중", "Organizing design candidates"),
      detail: progressText(locale, "ARCHITECT 결과와 디자인 시스템, 템플릿 카탈로그를 비교하고 있습니다.", "Comparing ARCHITECT output with design systems and templates."),
      status: "running"
    };
  }
  if (event.type === "turn.completed") {
    return {
      id: "complete",
      title: progressText(locale, "디자인 후보 준비 완료", "Design candidates ready"),
      detail: progressText(locale, "사용자가 고를 수 있는 디자인 기조와 화면 구성을 정리했습니다.", "Prepared design system and screen structure options."),
      status: "completed"
    };
  }
  if (event.type === "turn.failed") {
    return {
      id: "failed",
      title: progressText(locale, "디자인 추천 실패", "Design recommendation failed"),
      detail: event.error.message,
      status: "failed"
    };
  }
  if (event.type === "error") {
    return {
      id: "failed",
      title: progressText(locale, "디자인 추천 스트림 오류", "Design recommendation stream error"),
      detail: event.message,
      status: "failed"
    };
  }

  return describeCodexProgress(event, locale, {
    reasoningTitle: progressText(locale, "제품과 디자인 자산 매칭", "Matching product to design assets"),
    reasoningDetail: progressText(locale, "PRODUCT와 카탈로그를 비교해 어울리는 디자인 시스템과 템플릿 후보를 좁히고 있습니다.", "Comparing PRODUCT with the catalog to narrow design systems and templates."),
    agentTitle: progressText(locale, "추천 응답 작성", "Writing recommendation response"),
    agentDetail: progressText(locale, "추천 이유, 디자인 기조, 화면 구성을 사용자가 고를 수 있는 JSON 응답으로 작성하고 있습니다.", "Writing rationale, design direction, and screen structure options into the JSON response.")
  });
}

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

export function composeDesignMarkdown(response: DesignRuntimeResponse): string {
  return [
    "# DESIGN",
    "",
    `Runtime mode: ${modeDisplayName(response.mode)}`,
    `Generated at: ${response.generatedAt}`,
    "",
    `## ${response.title}`,
    "",
    response.summary,
    "",
    ...response.sections.flatMap((section) => [
      `## ${section.title}`,
      "",
      section.body,
      ""
    ]),
    "## Runtime Actions",
    "",
    ...response.actions.map((action) => `- **${action.label}** (${action.owner}): ${action.detail}`),
    "",
    "## Tracked Artifacts",
    "",
    ...response.artifacts.map((artifact) => `- \`${designArtifactDisplayPath(artifact.path)}\` (${artifact.type}) - ${artifact.title}: ${artifact.description}`),
    "",
    "## Generated Files",
    "",
    ...response.files.map((file) => `- \`${designArtifactDisplayPath(file.path)}\` (${file.type}) - ${file.title}`),
    ""
  ].join("\n");
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
    describeProgress: (event) => describeRecommendationProgress(event, params.locale),
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
    const progress = describeRecommendationProgress(event, params.locale);
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

async function readArchitectContext(projectRoot: string): Promise<string> {
  const architectRoot = join(projectRoot, "ARCHITECT");
  const files: Array<{ path: string; content: string }> = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const absolute = join(directory, entry.name);
      const relativePath = relative(projectRoot, absolute).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        if (entry.name !== "assets") {
          await visit(absolute);
        }
        continue;
      }
      if (!entry.isFile() || !/\.(html|css|js|json|md)$/i.test(entry.name)) {
        continue;
      }
      const info = await stat(absolute).catch(() => null);
      if (!info || info.size > 100_000) {
        continue;
      }
      files.push({
        path: relativePath,
        content: await readFile(absolute, "utf8")
      });
    }
  }

  await visit(architectRoot);
  return files.length
    ? files.map((file) => `--- ${file.path} ---\n${file.content}`).join("\n\n")
    : `No ARCHITECT files were found. Expected ${architectProductPath}.`;
}

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
    describeProgress: (event) => describeProgress(event, params.locale),
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
    const progress = describeProgress(event, params.locale);
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
