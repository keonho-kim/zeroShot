import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { Codex, type ApprovalMode, type ModelReasoningEffort, type SandboxMode, type ThreadEvent } from "@openai/codex-sdk";
import { z } from "zod";
import { loadAppConfig } from "@backend/config/app-config.js";
import { buildDesignPrompt, modeDisplayName } from "@backend/prompts/design/runtime-prompt.js";
import { architectProductPath, readProductHtml } from "@backend/services/file-service.js";
import { buildResourcePromptContext, listResourceCatalog, resourceCatalogSummary } from "@backend/services/resource-service.js";
import type {
  DesignRecommendationResponse,
  DesignProgressEvent,
  DesignRuntimeMode,
  DesignRuntimeResponse,
  ResourceManifest
} from "@backend/types.js";

const designRuntimeSchema = {
  type: "object",
  properties: {
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
  required: ["title", "summary", "sections", "actions", "artifacts", "files"],
  additionalProperties: false
};

const designRuntimeResponseSchema = z.object({
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
  required: ["title", "summary", "designSystems", "designTemplates"],
  additionalProperties: false
};

const designRecommendationResponseSchema = z.object({
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
  return locale === "ko" ? ko : en;
}

function describeProgress(event: ThreadEvent, locale: string): DesignProgressEvent | null {
  if (event.type === "thread.started") {
    return {
      id: "session",
      title: progressText(locale, "디자인 런타임 시작", "Design runtime started"),
      detail: progressText(locale, "제품 설계와 선택 리소스를 디자인 작업대로 넘겼습니다.", "Product direction and selected resources are entering the design workbench."),
      status: "completed"
    };
  }
  if (event.type === "turn.started") {
    return {
      id: "analysis",
      title: progressText(locale, "디자인 자료 분석 중", "Analyzing design inputs"),
      detail: progressText(locale, "제품 블루프린트, 디자인 템플릿, 편집 모드를 정리하고 있습니다.", "Reading the product blueprint, design template, and editing mode."),
      status: "running"
    };
  }
  if (event.type === "turn.completed") {
    return {
      id: "complete",
      title: progressText(locale, "디자인 런타임 결과 준비", "Design runtime output ready"),
      detail: progressText(locale, "DESIGN/index.html로 저장할 MAKEOVER 산출물을 준비했습니다.", "Prepared the MAKEOVER artifact for DESIGN/index.html."),
      status: "completed"
    };
  }
  if (event.type === "turn.failed") {
    return {
      id: "failed",
      title: progressText(locale, "디자인 런타임 실패", "Design runtime failed"),
      detail: event.error.message,
      status: "failed"
    };
  }
  if (event.type === "error") {
    return {
      id: "failed",
      title: progressText(locale, "디자인 스트림 오류", "Design stream error"),
      detail: event.message,
      status: "failed"
    };
  }

  const item = event.item;
  if (item.type === "reasoning") {
    return {
      id: "reasoning",
      title: progressText(locale, "디자인 방향 구조화", "Structuring design direction"),
      detail: progressText(locale, "생성, 와이어 프레임 편집, 프레젠테이션 편집에 맞는 작업 단계를 나누고 있습니다.", "Splitting work into generation, wireframe editing, and presentation editing steps."),
      status: event.type === "item.completed" ? "completed" : "running"
    };
  }
  if (item.type === "agent_message") {
    return {
      id: "draft",
      title: progressText(locale, "디자인 브리프 작성", "Writing design brief"),
      detail: progressText(locale, "실제 편집자가 따라갈 수 있는 디자인 산출물 계약을 작성하고 있습니다.", "Writing an actionable design artifact contract."),
      status: event.type === "item.completed" ? "completed" : "running"
    };
  }
  return null;
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

  const item = event.item;
  if (item.type === "reasoning") {
    return {
      id: "reasoning",
      title: progressText(locale, "제품과 자산 매칭 중", "Matching product to resources"),
      detail: progressText(locale, "제품 성격에 맞는 디자인 시스템과 템플릿 후보를 추리고 있습니다.", "Finding design systems and templates that fit the product."),
      status: event.type === "item.completed" ? "completed" : "running"
    };
  }
  if (item.type === "agent_message") {
    return {
      id: "draft",
      title: progressText(locale, "추천 선택지 작성 중", "Writing recommendation options"),
      detail: progressText(locale, "이름 대신 사용자가 이해할 수 있는 느낌과 이유로 선택지를 작성하고 있습니다.", "Writing options as readable direction and rationale instead of raw resource names."),
      status: event.type === "item.completed" ? "completed" : "running"
    };
  }
  return null;
}

function resourceList(title: string, resources: ResourceManifest[]): string {
  return [
    `## ${title}`,
    ...resources.map((resource) => [
      `- id: ${resource.id}`,
      `  name: ${resource.name}`,
      resource.description ? `  description: ${resource.description.replace(/\s+/g, " ").slice(0, 240)}` : "",
      resource.tags.length ? `  tags: ${resource.tags.join(", ")}` : ""
    ].filter(Boolean).join("\n"))
  ].join("\n");
}

function buildRecommendationPrompt(params: {
  locale: string;
  productHtml: string;
  architectContext: string;
  catalog: { skills: ResourceManifest[]; designTemplates: ResourceManifest[]; designSystems: ResourceManifest[] };
}): string {
  const language = params.locale === "ko" ? "Korean" : "English";
  return [
    "You are ZeroShot DESIGN recommendation agent.",
    "",
    "Return only JSON matching the provided schema.",
    "Recommend exactly 5 design systems and exactly 5 design templates for the MAKEOVER request flow.",
    "Every resourceId must be copied exactly from the provided resource catalog.",
    "Do not invent resource IDs. Do not expose raw resource names as labels.",
    "Write labels, details, and reasons as user-facing choices that describe the feel, structure, and fit.",
    `Use ${language} for title, summary, labels, details, and reasons.`,
    "",
    "Recommendation criteria:",
    "- Use ARCHITECT/PRODUCT.html as the primary product contract.",
    "- Match the product's target user, workflow density, interaction style, and content shape.",
    "- Prefer polished, modern product-grade UI/UX over generic templates.",
    "- Skills are available read-only context, but are not user-selectable.",
    "",
    resourceCatalogSummary(params.catalog),
    "",
    resourceList("Selectable Design Systems", params.catalog.designSystems),
    "",
    resourceList("Selectable Design Templates", params.catalog.designTemplates),
    "",
    "ARCHITECT folder context:",
    params.architectContext || "No ARCHITECT folder context was found.",
    "",
    "ARCHITECT/PRODUCT.html source:",
    params.productHtml || "No ARCHITECT/PRODUCT.html was found."
  ].join("\n");
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
    ...response.artifacts.map((artifact) => `- \`${artifact.path}\` (${artifact.type}) - ${artifact.title}: ${artifact.description}`),
    "",
    "## Generated Files",
    "",
    ...response.files.map((file) => `- \`${file.path}\` (${file.type}) - ${file.title}`),
    ""
  ].join("\n");
}

export async function recommendDesignResources(params: {
  projectRoot: string;
  locale: string;
  model?: string;
  onProgress?: (event: DesignProgressEvent) => void;
}): Promise<DesignRecommendationResponse> {
  const appConfig = await loadAppConfig();
  const productHtml = await readProductHtml(params.projectRoot).catch(() => "");
  const architectContext = await readArchitectContext(params.projectRoot).catch(() => "");
  const catalog = await listResourceCatalog();

  const codex = new Codex();
  const thread = codex.startThread({
    workingDirectory: params.projectRoot,
    skipGitRepoCheck: true,
    approvalPolicy: "never" satisfies ApprovalMode,
    sandboxMode: "read-only" satisfies SandboxMode,
    modelReasoningEffort: asReasoningEffort(appConfig.defaults.planReasoning),
    additionalDirectories: [appConfig.resourceRoots.skills, appConfig.resourceRoots.designTemplates, appConfig.resourceRoots.designSystems],
    ...(params.model ? { model: params.model } : {})
  });

  const { events } = await thread.runStreamed(buildRecommendationPrompt({
    locale: params.locale,
    productHtml,
    architectContext,
    catalog
  }), {
    outputSchema: designRecommendationSchema
  });
  let finalResponse = "";

  for await (const event of events) {
    const progress = describeRecommendationProgress(event, params.locale);
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
    throw new Error("Codex did not return design recommendations.");
  }

  return validateDesignRecommendations(JSON.parse(finalResponse), catalog);
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
  onProgress?: (event: DesignProgressEvent) => void;
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
  const thread = codex.startThread({
    workingDirectory: params.projectRoot,
    skipGitRepoCheck: true,
    approvalPolicy: "never" satisfies ApprovalMode,
    sandboxMode: "read-only" satisfies SandboxMode,
    modelReasoningEffort: asReasoningEffort(appConfig.defaults.planReasoning),
    additionalDirectories: [appConfig.resourceRoots.skills, appConfig.resourceRoots.designTemplates, appConfig.resourceRoots.designSystems],
    ...(params.model ? { model: params.model } : {})
  });

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
    throw new Error("Codex did not return a design runtime response.");
  }

  const parsed = designRuntimeResponseSchema.parse(JSON.parse(finalResponse));
  if (!parsed.files.some((file) => file.path === "DESIGN/index.html")) {
    throw new Error("Design runtime did not return DESIGN/index.html.");
  }
  const response: DesignRuntimeResponse = {
    id: crypto.randomUUID(),
    projectRoot: params.projectRoot,
    mode: params.mode,
    generatedAt: new Date().toISOString(),
    designMarkdown: "",
    ...parsed
  };
  return {
    ...response,
    designMarkdown: composeDesignMarkdown(response)
  };
}
