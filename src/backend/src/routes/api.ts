import express, { type NextFunction, type Request, type RequestHandler, type Response, type Router } from "express";
import { stat } from "node:fs/promises";
import { basename, relative } from "node:path";
import { loadAppConfig, saveAppConfig } from "@backend/config/app-config.js";
import { loadCodexSettings, readProjectCodexSettings, saveCodexSettings, saveProjectCodexSettings } from "@backend/config/codex-config.js";
import { assertPathWithinRoots, assertProjectRootWithinRoots, isWithin, listDirectoryEntries } from "@backend/core/path-guards.js";
import { createSseStream } from "@backend/core/sse.js";
import { readAuthStatus, saveAuthFile } from "@backend/services/auth-service.js";
import { buildArchitectDecisions, buildArchitectProductHtml, type ArchitectProgressEvent } from "@backend/services/architect-service.js";
import { readLatestDesignSession, readProjectSettings, recordArchitectSession, saveProjectSettings } from "@backend/services/app-storage-service.js";
import { saveArchitectProductFiles, saveDesignRuntimeArtifacts } from "@backend/services/artifact-workflow-service.js";
import { inferBootstrapRequest, runBootstrap } from "@backend/services/bootstrap-service.js";
import { buildDesignRuntime, recommendDesignResources } from "@backend/services/design-service.js";
import { highlightCode, normalizeHighlightLanguage } from "@backend/services/code-highlighting-service.js";
import { appendAppEvent } from "@backend/services/event-log-service.js";
import { createDirectory, deleteEntry, readDesignHtmlSnapshot, readProductHtml, readProductHtmlSnapshot, upsertArtifactManifest, writeDesignHtmlSnapshot, writeProductHtml, writeProductHtmlSnapshot, writeUpdateDocument } from "@backend/services/file-service.js";
import { readRunDetail, listRuns } from "@backend/services/history-service.js";
import { jobManager } from "@backend/services/job-manager.js";
import { listWorkLogProjects } from "@backend/services/log-service.js";
import { runOmakasePipeline } from "@backend/services/omakase-service.js";
import { startPipelineRun } from "@backend/services/pipeline-run-service.js";
import { readProjectHistoryMeta, readProjectState } from "@backend/services/project-service.js";
import { buildResourcePromptContext, listResourceCatalog } from "@backend/services/resource-service.js";
import { buildUpdateDecisions, type UpdateProgressEvent } from "@backend/services/update-service.js";
import { appendWorkflowLogEvent, createWorkflowLogRecord, readWorkflowLogBoard, readWorkflowLogRecord } from "@backend/services/workflow-log-service.js";
import { normalizeLocale } from "@backend/i18n/locale.js";
import type { BootstrapRequest, DesignProgressEvent, DesignRuntimeMode, PipelineOptions, RunMode } from "@backend/types.js";

const router: Router = express.Router();

function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function getValidatedProjectRoot(projectRoot: string): Promise<string> {
  const config = await loadAppConfig();
  return assertProjectRootWithinRoots(projectRoot, getBrowsableRoots(config), "browsable roots");
}

function getBrowsableRoots(config: Awaited<ReturnType<typeof loadAppConfig>>): string[] {
  return Array.from(new Set([...config.bootstrapRoots, ...config.allowedRoots]));
}

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\.$/, "");
}

function toDesignRuntimeMode(value: unknown): DesignRuntimeMode {
  if (value === "figma" || value === "powerpoint") {
    return value;
  }
  return "codex";
}

async function appendActiveResourceContext(projectRoot: string, content: string): Promise<string> {
  const settings = await readProjectSettings(projectRoot);
  const resourceContext = await buildResourcePromptContext({
    activeSkillId: settings.activeSkillId,
    activeDesignTemplateId: settings.activeDesignTemplateId,
    activeDesignSystemId: settings.activeDesignSystemId,
    includeCatalogSummary: true
  });

  if (!resourceContext.trim()) {
    return content;
  }

  return [
    content.trimEnd(),
    "",
    "## Active Open Design Resources",
    "",
    "The following locally loaded ZeroShot resources are part of this product direction. Use them as concrete guidance when implementing the build.",
    "",
    resourceContext,
    ""
  ].join("\n");
}

function productContentToHtml(content: string): string {
  const trimmed = content.trim();
  if (/<!doctype html/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
    return trimmed;
  }
  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>PRODUCT</title></head>",
    "<body>",
    "<main>",
    "<h1>PRODUCT Blueprint</h1>",
    `<pre>${escapeHtml(trimmed)}</pre>`,
    "</main>",
    "</body>",
    "</html>",
    ""
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function workflowProgressMessage(event: { title?: string; detail?: string; status?: string }): string {
  return [event.title, event.detail, event.status].filter(Boolean).join(" · ");
}

function workflowRawMessage(event: unknown): string {
  if (event && typeof event === "object" && "type" in event) {
    return String((event as { type?: unknown }).type ?? "raw");
  }
  return "raw";
}

async function buildDirectoryEntry(projectRoot: string, absolutePath: string, allowedRoots: string[]) {
  const entryStats = await stat(absolutePath);
  const historyMeta = entryStats.isDirectory()
    ? await readProjectHistoryMeta(absolutePath)
    : { hasWorkHistory: false, runsCount: 0 };

  return {
    name: basename(absolutePath),
    path: absolutePath,
    relativePath: normalizeRelativePath(relative(projectRoot, absolutePath)),
    isDirectory: entryStats.isDirectory(),
    isAllowedRoot: entryStats.isDirectory() ? allowedRoots.includes(absolutePath) : false,
    hasWorkHistory: historyMeta.hasWorkHistory,
    runsCount: historyMeta.runsCount
  };
}

router.get("/auth/status", asyncHandler(async (_req: Request, res: Response) => {
  res.json(await readAuthStatus());
}));

router.put("/auth", asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { content?: string };
  if (typeof body.content !== "string" || !body.content.trim()) {
    res.status(400).json({ message: "auth.json content is required" });
    return;
  }

  try {
    const status = await saveAuthFile(body.content);
    res.json(status);
  } catch {
    res.status(400).json({ message: "auth.json must be valid JSON" });
  }
}));

router.get("/projects/tree", asyncHandler(async (req: Request, res: Response) => {
  const config = await loadAppConfig();
  const targetPath = typeof req.query.path === "string" ? req.query.path : "";
  const browsableRoots = getBrowsableRoots(config);

  if (!targetPath) {
    const roots = await Promise.all(
      browsableRoots.map(async (root) => ({
        name: root,
        path: root,
        relativePath: "",
        isDirectory: true,
        isAllowedRoot: config.allowedRoots.includes(root),
        hasWorkHistory: false,
        runsCount: 0
      }))
    );
    res.json({ path: "", entries: roots });
    return;
  }

  const validated = await assertPathWithinRoots(targetPath, browsableRoots, "browsable roots");
  const entries = await listDirectoryEntries(validated, validated, {
    hideHidden: true,
    allowedRoots: config.allowedRoots,
    includeHistoryMeta: false
  });
  res.json({ path: validated, entries });
}));

router.post("/projects/allow", asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { path?: string };
  if (typeof body.path !== "string" || !body.path.trim()) {
    res.status(400).json({ message: "path is required" });
    return;
  }

  const config = await loadAppConfig();
  const validated = await assertPathWithinRoots(body.path, config.bootstrapRoots, "home directory");
  const nextAllowedRoots = Array.from(new Set([...config.allowedRoots, validated]));

  const nextConfig = {
    ...config,
    allowedRoots: nextAllowedRoots
  };

  await saveAppConfig(nextConfig);
  res.json(nextConfig);
}));

router.post("/projects/directory", asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { parentPath?: string; name?: string };
  if (typeof body.parentPath !== "string" || !body.parentPath.trim()) {
    res.status(400).json({ message: "parentPath is required" });
    return;
  }
  if (typeof body.name !== "string" || !body.name.trim()) {
    res.status(400).json({ message: "name is required" });
    return;
  }

  const config = await loadAppConfig();
  const validatedParent = await assertPathWithinRoots(body.parentPath, getBrowsableRoots(config), "browsable roots");

  try {
    const createdPath = await createDirectory(validatedParent, body.name.trim());
    res.status(201).json(await buildDirectoryEntry(validatedParent, createdPath, config.allowedRoots));
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { statusCode?: number };
    if (err.code === "EEXIST") {
      res.status(409).json({ message: "Directory already exists" });
      return;
    }
    res.status(err.statusCode ?? 500).json({ message: err.message });
  }
}));

router.delete("/projects/directory", asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { path?: string };
  if (typeof body.path !== "string" || !body.path.trim()) {
    res.status(400).json({ message: "path is required" });
    return;
  }

  const config = await loadAppConfig();
  const browsableRoots = getBrowsableRoots(config);
  const validated = await assertPathWithinRoots(body.path, browsableRoots, "browsable roots");

  if (config.bootstrapRoots.includes(validated)) {
    res.status(400).json({ message: "Cannot delete the home directory root" });
    return;
  }

  await deleteEntry(validated);

  const nextAllowedRoots = config.allowedRoots.filter((root) => !isWithin(validated, root));
  if (nextAllowedRoots.length !== config.allowedRoots.length) {
    await saveAppConfig({
      ...config,
      allowedRoots: nextAllowedRoots
    });
  }

  res.status(204).end();
}));

router.get("/projects/state", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readProjectState(projectRoot));
}));

router.get("/projects/settings", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readProjectSettings(projectRoot));
}));

router.put("/projects/settings", asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { projectRoot?: string; activeSkillId?: string; activeDesignTemplateId?: string; activeDesignSystemId?: string };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  const settings = await saveProjectSettings({
    projectRoot,
    activeSkillId: typeof body.activeSkillId === "string" && body.activeSkillId ? body.activeSkillId : undefined,
    activeDesignTemplateId: typeof body.activeDesignTemplateId === "string" && body.activeDesignTemplateId ? body.activeDesignTemplateId : undefined,
    activeDesignSystemId: typeof body.activeDesignSystemId === "string" && body.activeDesignSystemId ? body.activeDesignSystemId : undefined
  });
  await appendAppEvent("project_settings_saved", {
    projectRoot,
    activeSkillId: settings.activeSkillId ?? null,
    activeDesignTemplateId: settings.activeDesignTemplateId ?? null,
    activeDesignSystemId: settings.activeDesignSystemId ?? null
  });
  res.json(settings);
}));

router.get("/projects/product-html", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.type("html").send(await readProductHtml(projectRoot));
}));

router.get("/projects/product-artifact", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readProductHtmlSnapshot(projectRoot));
}));

router.get("/projects/design-artifact", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readDesignHtmlSnapshot(projectRoot));
}));

router.post("/architect/decisions", asyncHandler(async (req: Request, res: Response) => {
  const auth = await readAuthStatus();
  if (!auth.valid) {
    res.status(412).json(auth);
    return;
  }

  const body = req.body as {
    projectRoot?: string;
    goal?: string;
    locale?: string;
    model?: string;
    activeSkillId?: string;
    activeDesignTemplateId?: string;
    activeDesignSystemId?: string;
  };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  if (typeof body.goal !== "string" || !body.goal.trim()) {
    res.status(400).json({ message: "Architect goal is required" });
    return;
  }

  try {
    const appConfig = await loadAppConfig();
    const decisions = await buildArchitectDecisions({
      projectRoot,
      goal: body.goal.trim(),
      locale: normalizeLocale(body.locale),
      reasoning: appConfig.defaults.planReasoning,
      model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : undefined,
      additionalDirectories: [appConfig.resourceRoots.skills, appConfig.resourceRoots.designTemplates, appConfig.resourceRoots.designSystems],
      resourceContext: await buildResourcePromptContext({
        activeSkillId: body.activeSkillId,
        activeDesignTemplateId: body.activeDesignTemplateId,
        activeDesignSystemId: body.activeDesignSystemId,
        includeCatalogSummary: true
      })
    });
    await recordArchitectSession({
      projectRoot,
      goal: body.goal.trim(),
      title: decisions.title,
      summary: decisions.summary,
      decisions
    });
    await appendAppEvent("architect_decisions_created", {
      projectRoot,
      title: decisions.title,
      decisionsCount: decisions.decisions.length
    });
    res.json(decisions);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(502).json({ message: `Codex could not produce architect decisions: ${message}` });
  }
}));

router.post("/architect/decisions/stream", asyncHandler(async (req: Request, res: Response) => {
  const auth = await readAuthStatus();
  if (!auth.valid) {
    res.status(412).json(auth);
    return;
  }

  const body = req.body as {
    projectRoot?: string;
    goal?: string;
    locale?: string;
    model?: string;
    activeSkillId?: string;
    activeDesignTemplateId?: string;
    activeDesignSystemId?: string;
  };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  if (typeof body.goal !== "string" || !body.goal.trim()) {
    res.status(400).json({ message: "Architect goal is required" });
    return;
  }

  const stream = createSseStream(res);

  try {
    const appConfig = await loadAppConfig();
    const workflowRecord = await createWorkflowLogRecord({
      projectRoot,
      stage: "product",
      section: "logs",
      kind: "log",
      title: "ARCHITECT decisions",
      summary: body.goal.trim()
    });
    const decisions = await buildArchitectDecisions({
      projectRoot,
      goal: body.goal.trim(),
      locale: normalizeLocale(body.locale),
      reasoning: appConfig.defaults.planReasoning,
      model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : undefined,
      additionalDirectories: [appConfig.resourceRoots.skills, appConfig.resourceRoots.designTemplates, appConfig.resourceRoots.designSystems],
      resourceContext: await buildResourcePromptContext({
        activeSkillId: body.activeSkillId,
        activeDesignTemplateId: body.activeDesignTemplateId,
        activeDesignSystemId: body.activeDesignSystemId,
        includeCatalogSummary: true
      }),
      onProgress: async (event: ArchitectProgressEvent) => {
        await appendWorkflowLogEvent(workflowRecord.id, { type: "progress", message: workflowProgressMessage(event), payload: event });
        await stream.write("progress", event);
      },
      onMessage: async (message) => {
        await appendWorkflowLogEvent(workflowRecord.id, { type: "message", message, payload: { message } });
        await stream.write("message", { message });
      },
      onRaw: async (event) => {
        await appendWorkflowLogEvent(workflowRecord.id, { type: "raw", message: workflowRawMessage(event), payload: event });
        await stream.write("raw", event);
      }
    });
    await recordArchitectSession({
      projectRoot,
      goal: body.goal.trim(),
      title: decisions.title,
      summary: decisions.summary,
      decisions
    });
    await appendAppEvent("architect_decisions_created", {
      projectRoot,
      title: decisions.title,
      decisionsCount: decisions.decisions.length
    });
    await appendWorkflowLogEvent(workflowRecord.id, { type: "complete", message: decisions.title, payload: { decisionsCount: decisions.decisions.length } });
    await stream.write("complete", { decisions });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await stream.write("error", { message: `Codex could not produce architect decisions: ${message}` });
  } finally {
    stream.close();
  }
}));

router.post("/architect/bootstrap", asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as {
    projectRoot?: string;
    answers?: Record<string, string>;
    decisions?: Array<{ id: string; section: string; title: string; prompt: string; options: Array<{ id: string; label: string; detail: string; productRequirement: string }> }>;
    request?: BootstrapRequest;
  };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? body.request?.projectRoot ?? ""));
  const request = body.request
    ? { ...body.request, projectRoot }
    : inferBootstrapRequest({
      projectRoot,
      answers: body.answers ?? {},
      decisions: body.decisions ?? []
    });
  res.json(await runBootstrap(request));
}));

router.post("/architect/product-html", asyncHandler(async (req: Request, res: Response) => {
  const auth = await readAuthStatus();
  if (!auth.valid) {
    res.status(412).json(auth);
    return;
  }

  const body = req.body as {
    projectRoot?: string;
    userBrief?: string;
    decisionSet?: unknown;
    answers?: Record<string, string>;
    locale?: string;
    model?: string;
    activeSkillId?: string;
    activeDesignTemplateId?: string;
    activeDesignSystemId?: string;
  };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  if (!body.decisionSet || typeof body.userBrief !== "string" || !body.userBrief.trim()) {
    res.status(400).json({ message: "Architect decisions and user brief are required" });
    return;
  }

  try {
    const appConfig = await loadAppConfig();
    const files = await buildArchitectProductHtml({
      projectRoot,
      userBrief: body.userBrief.trim(),
      decisionSet: body.decisionSet as Parameters<typeof buildArchitectProductHtml>[0]["decisionSet"],
      answers: body.answers ?? {},
      locale: normalizeLocale(body.locale),
      reasoning: appConfig.defaults.planReasoning,
      model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : undefined,
      additionalDirectories: [appConfig.resourceRoots.skills, appConfig.resourceRoots.designTemplates, appConfig.resourceRoots.designSystems],
      resourceContext: await buildResourcePromptContext({
        activeSkillId: body.activeSkillId,
        activeDesignTemplateId: body.activeDesignTemplateId,
        activeDesignSystemId: body.activeDesignSystemId,
        includeCatalogSummary: true
      })
    });
    const file = await saveArchitectProductFiles(projectRoot, files);
    await createWorkflowLogRecord({
      projectRoot,
      stage: "product",
      section: "decisions",
      kind: "decisions",
      title: (body.decisionSet as { title?: string }).title ?? "PRODUCT decisions",
      summary: body.userBrief.trim(),
      payload: {
        mode: "manual",
        decisionSet: body.decisionSet,
        answers: body.answers ?? {}
      }
    });
    res.json(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(502).json({ message: `Codex could not create PRODUCT.html: ${message}` });
  }
}));

router.post("/architect/product-html/stream", asyncHandler(async (req: Request, res: Response) => {
  const auth = await readAuthStatus();
  if (!auth.valid) {
    res.status(412).json(auth);
    return;
  }

  const body = req.body as {
    projectRoot?: string;
    userBrief?: string;
    decisionSet?: unknown;
    answers?: Record<string, string>;
    locale?: string;
    model?: string;
    activeSkillId?: string;
    activeDesignTemplateId?: string;
    activeDesignSystemId?: string;
  };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  if (!body.decisionSet || typeof body.userBrief !== "string" || !body.userBrief.trim()) {
    res.status(400).json({ message: "Architect decisions and user brief are required" });
    return;
  }

  const stream = createSseStream(res);

  try {
    const appConfig = await loadAppConfig();
    const workflowRecord = await createWorkflowLogRecord({
      projectRoot,
      stage: "product",
      section: "logs",
      kind: "log",
      title: "PRODUCT blueprint generation",
      summary: body.userBrief.trim()
    });
    const files = await buildArchitectProductHtml({
      projectRoot,
      userBrief: body.userBrief.trim(),
      decisionSet: body.decisionSet as Parameters<typeof buildArchitectProductHtml>[0]["decisionSet"],
      answers: body.answers ?? {},
      locale: normalizeLocale(body.locale),
      reasoning: appConfig.defaults.planReasoning,
      model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : undefined,
      additionalDirectories: [appConfig.resourceRoots.skills, appConfig.resourceRoots.designTemplates, appConfig.resourceRoots.designSystems],
      resourceContext: await buildResourcePromptContext({
        activeSkillId: body.activeSkillId,
        activeDesignTemplateId: body.activeDesignTemplateId,
        activeDesignSystemId: body.activeDesignSystemId,
        includeCatalogSummary: true
      }),
      onProgress: async (event: ArchitectProgressEvent) => {
        await appendWorkflowLogEvent(workflowRecord.id, { type: "progress", message: workflowProgressMessage(event), payload: event });
        await stream.write("progress", event);
      },
      onMessage: async (message) => {
        await appendWorkflowLogEvent(workflowRecord.id, { type: "message", message, payload: { message } });
        await stream.write("message", { message });
      },
      onRaw: async (event) => {
        await appendWorkflowLogEvent(workflowRecord.id, { type: "raw", message: workflowRawMessage(event), payload: event });
        await stream.write("raw", event);
      }
    });
    const file = await saveArchitectProductFiles(projectRoot, files);
    await createWorkflowLogRecord({
      projectRoot,
      stage: "product",
      section: "decisions",
      kind: "decisions",
      title: (body.decisionSet as { title?: string }).title ?? "PRODUCT decisions",
      summary: body.userBrief.trim(),
      payload: {
        mode: "manual",
        decisionSet: body.decisionSet,
        answers: body.answers ?? {}
      }
    });
    await appendWorkflowLogEvent(workflowRecord.id, { type: "complete", message: file.path, payload: { file } });
    await stream.write("complete", { file });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await stream.write("error", { message: `Codex could not create PRODUCT.html: ${message}` });
  } finally {
    stream.close();
  }
}));

router.put("/projects/product-html", asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { projectRoot: string; content?: string; markdownMirror?: string };
  const projectRoot = await getValidatedProjectRoot(body.projectRoot);
  if (typeof body.content !== "string" || !body.content.trim()) {
    res.status(400).json({ message: "PRODUCT.html content is required" });
    return;
  }

  await writeProductHtml(projectRoot, body.content);
  await upsertArtifactManifest(projectRoot, [{
    path: "ARCHITECT/PRODUCT.html",
    type: "text/html",
    title: "ARCHITECT/PRODUCT.html",
    entry: true
  }]);
  await appendAppEvent("product_html_saved", { projectRoot });
  res.status(204).end();
}));

router.put("/projects/product-artifact", asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { projectRoot: string; content?: string; markdownMirror?: string; etag?: string };
  const projectRoot = await getValidatedProjectRoot(body.projectRoot);
  if (typeof body.content !== "string" || !body.content.trim()) {
    res.status(400).json({ message: "Product blueprint content is required" });
    return;
  }

  try {
    const file = await writeProductHtmlSnapshot(projectRoot, body.content, body.etag);
    await upsertArtifactManifest(projectRoot, [{
      path: file.path,
      type: "text/html",
      title: "PRODUCT BLUEPRINT",
      entry: true
    }]);
    await appendAppEvent("product_artifact_saved", {
      projectRoot,
      path: file.path,
      etag: file.etag
    });
    res.json(file);
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    res.status(err.statusCode ?? 500).json({ message: err.message });
  }
}));

router.put("/projects/design-artifact", asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { projectRoot: string; content?: string; etag?: string };
  const projectRoot = await getValidatedProjectRoot(body.projectRoot);
  if (typeof body.content !== "string" || !body.content.trim()) {
    res.status(400).json({ message: "Design artifact content is required" });
    return;
  }

  try {
    const file = await writeDesignHtmlSnapshot(projectRoot, body.content, body.etag);
    await upsertArtifactManifest(projectRoot, [{
      path: file.path,
      type: "text/html",
      title: "DESIGN",
      entry: true
    }]);
    await appendAppEvent("design_artifact_saved", {
      projectRoot,
      path: file.path,
      etag: file.etag
    });
    res.json(file);
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    res.status(err.statusCode ?? 500).json({ message: err.message });
  }
}));

router.get("/design/latest", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readLatestDesignSession(projectRoot));
}));

router.post("/design/recommendations/stream", asyncHandler(async (req: Request, res: Response) => {
  const auth = await readAuthStatus();
  if (!auth.valid) {
    res.status(412).json(auth);
    return;
  }

  const body = req.body as {
    projectRoot?: string;
    locale?: string;
    model?: string;
  };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  const projectState = await readProjectState(projectRoot);
  if (!projectState.hasProductHtml) {
    res.status(409).type("text").send("PRODUCT BLUEPRINT is required before DESIGN recommendations can run.");
    return;
  }

  const stream = createSseStream(res);

  try {
    const workflowRecord = await createWorkflowLogRecord({
      projectRoot,
      stage: "design",
      section: "logs",
      kind: "log",
      title: "DESIGN recommendations",
      summary: "Codex explored design systems and templates."
    });
    const recommendations = await recommendDesignResources({
      projectRoot,
      locale: normalizeLocale(body.locale),
      model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : undefined,
      onProgress: async (event: DesignProgressEvent) => {
        await appendWorkflowLogEvent(workflowRecord.id, { type: "progress", message: workflowProgressMessage(event), payload: event });
        await stream.write("progress", event);
      },
      onMessage: async (message) => {
        await appendWorkflowLogEvent(workflowRecord.id, { type: "message", message, payload: { message } });
        await stream.write("message", { message });
      },
      onRaw: async (event) => {
        await appendWorkflowLogEvent(workflowRecord.id, { type: "raw", message: workflowRawMessage(event), payload: event });
        await stream.write("raw", event);
      }
    });
    await appendWorkflowLogEvent(workflowRecord.id, { type: "complete", message: recommendations.title, payload: { recommendations } });
    await stream.write("complete", { recommendations });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await stream.write("error", { message: `Design recommendations failed: ${message}` });
  } finally {
    stream.close();
  }
}));

router.post("/design/runtime/stream", asyncHandler(async (req: Request, res: Response) => {
  const auth = await readAuthStatus();
  if (!auth.valid) {
    res.status(412).json(auth);
    return;
  }

  const body = req.body as {
    projectRoot?: string;
    mode?: string;
    goal?: string;
    locale?: string;
    activeSkillId?: string;
    activeDesignTemplateId?: string;
    activeDesignSystemId?: string;
    model?: string;
  };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  const mode = toDesignRuntimeMode(body.mode);
  const projectState = await readProjectState(projectRoot);
  if (!projectState.hasProductHtml) {
    res.status(409).type("text").send("PRODUCT BLUEPRINT is required before DESIGN can run.");
    return;
  }

  const stream = createSseStream(res);

  try {
    const workflowRecord = await createWorkflowLogRecord({
      projectRoot,
      stage: "design",
      section: "logs",
      kind: "log",
      title: "DESIGN runtime",
      summary: typeof body.goal === "string" ? body.goal.trim() : ""
    });
    const design = await buildDesignRuntime({
      projectRoot,
      mode,
      goal: typeof body.goal === "string" ? body.goal.trim() : "",
      locale: normalizeLocale(body.locale),
      activeSkillId: body.activeSkillId,
      activeDesignTemplateId: body.activeDesignTemplateId,
      activeDesignSystemId: body.activeDesignSystemId,
      model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : undefined,
      onProgress: async (event: DesignProgressEvent) => {
        await appendWorkflowLogEvent(workflowRecord.id, { type: "progress", message: workflowProgressMessage(event), payload: event });
        await stream.write("progress", event);
      },
      onMessage: async (message) => {
        await appendWorkflowLogEvent(workflowRecord.id, { type: "message", message, payload: { message } });
        await stream.write("message", { message });
      },
      onRaw: async (event) => {
        await appendWorkflowLogEvent(workflowRecord.id, { type: "raw", message: workflowRawMessage(event), payload: event });
        await stream.write("raw", event);
      }
    });
    await saveDesignRuntimeArtifacts(projectRoot, mode, design);
    await createWorkflowLogRecord({
      projectRoot,
      stage: "design",
      section: "decisions",
      kind: "decisions",
      title: "DESIGN decisions",
      summary: design.title,
      payload: {
        mode,
        goal: typeof body.goal === "string" ? body.goal.trim() : "",
        activeSkillId: body.activeSkillId,
        activeDesignTemplateId: body.activeDesignTemplateId,
        activeDesignSystemId: body.activeDesignSystemId
      }
    });
    await appendWorkflowLogEvent(workflowRecord.id, { type: "complete", message: design.title, payload: { designId: design.id } });
    await stream.write("complete", { design });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await stream.write("error", { message: `Design runtime failed: ${message}` });
  } finally {
    stream.close();
  }
}));

async function startPipeline(mode: RunMode, req: Request, res: Response) {
  const auth = await readAuthStatus();
  if (!auth.valid) {
    res.status(412).json(auth);
    return;
  }

  const body = req.body as {
    projectRoot: string;
    productContent?: string;
    updateContent?: string;
    updateRequest?: string;
    updateDecisionSet?: unknown;
    updateAnswers?: Record<string, string>;
    options?: PipelineOptions;
  };
  const projectRoot = await getValidatedProjectRoot(body.projectRoot);
  const projectState = await readProjectState(projectRoot);

  if (mode === "build" && !projectState.buildEnabled) {
    res.status(409).json({ message: "BUILD needs a product blueprint or non-empty workspace." });
    return;
  }

  if (mode === "update" && !projectState.updateEnabled) {
    res.status(409).json({ message: "UPDATE needs a completed build run and source code." });
    return;
  }

  if (typeof body.productContent === "string" && body.productContent.trim()) {
    const content = body.productContent.trim();
    await writeProductHtml(projectRoot, productContentToHtml(
      /<!doctype html/i.test(content) || /<html[\s>]/i.test(content)
        ? content
        : await appendActiveResourceContext(projectRoot, content)
    ));
  }
  if (mode === "update" && typeof body.updateContent === "string") {
    await writeUpdateDocument(projectRoot, body.updateContent);
    if (typeof body.updateRequest === "string" && body.updateRequest.trim()) {
      await createWorkflowLogRecord({
        projectRoot,
        stage: "update",
        section: "request",
        kind: "request",
        title: "UPDATE request",
        summary: body.updateRequest.trim().slice(0, 160),
        payload: { request: body.updateRequest.trim() }
      });
    }
    if (body.updateDecisionSet) {
      await createWorkflowLogRecord({
        projectRoot,
        stage: "update",
        section: "decisions",
        kind: "decisions",
        title: (body.updateDecisionSet as { title?: string }).title ?? "UPDATE decisions",
        summary: (body.updateDecisionSet as { summary?: string }).summary ?? "",
        payload: {
          decisionSet: body.updateDecisionSet,
          answers: body.updateAnswers ?? {}
        }
      });
    }
  }

  const job = await startPipelineRun(mode, projectRoot, body.options);
  res.status(202).json(job);
}

router.post("/build", asyncHandler(async (req: Request, res: Response) => startPipeline("build", req, res)));

router.post("/omakase/stream", asyncHandler(async (req: Request, res: Response) => {
  const auth = await readAuthStatus();
  if (!auth.valid) {
    res.status(412).json(auth);
    return;
  }

  const body = req.body as {
    projectRoot?: string;
    brief?: string;
    locale?: string;
    options?: PipelineOptions;
  };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  const brief = typeof body.brief === "string" ? body.brief.trim() : "";
  if (!brief) {
    res.status(400).json({ message: "Omakase brief is required." });
    return;
  }

  const stream = createSseStream(res);
  try {
    await runOmakasePipeline({
      projectRoot,
      brief,
      locale: body.locale,
      options: body.options
    }, stream);
  } finally {
    stream.close();
  }
}));

router.post("/update/decisions/stream", asyncHandler(async (req: Request, res: Response) => {
  const auth = await readAuthStatus();
  if (!auth.valid) {
    res.status(412).json(auth);
    return;
  }

  const body = req.body as {
    projectRoot?: string;
    updateRequest?: string;
    locale?: string;
    model?: string;
  };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  const projectState = await readProjectState(projectRoot);
  if (!projectState.updateEnabled) {
    res.status(409).json({ message: "UPDATE needs a completed build run and source code." });
    return;
  }
  if (typeof body.updateRequest !== "string" || !body.updateRequest.trim()) {
    res.status(400).json({ message: "Update request is required" });
    return;
  }

  const stream = createSseStream(res);

  try {
    const appConfig = await loadAppConfig();
    const workflowRecord = await createWorkflowLogRecord({
      projectRoot,
      stage: "update",
      section: "update-log",
      kind: "log",
      title: "UPDATE decision generation",
      summary: body.updateRequest.trim()
    });
    const decisions = await buildUpdateDecisions({
      projectRoot,
      updateRequest: body.updateRequest.trim(),
      locale: normalizeLocale(body.locale),
      reasoning: appConfig.defaults.planReasoning,
      model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : undefined,
      additionalDirectories: [appConfig.resourceRoots.skills, appConfig.resourceRoots.designTemplates, appConfig.resourceRoots.designSystems],
      onProgress: async (event: UpdateProgressEvent) => {
        await appendWorkflowLogEvent(workflowRecord.id, { type: "progress", message: workflowProgressMessage(event), payload: event });
        await stream.write("progress", event);
      },
      onMessage: async (message) => {
        await appendWorkflowLogEvent(workflowRecord.id, { type: "message", message, payload: { message } });
        await stream.write("message", { message });
      },
      onRaw: async (event) => {
        await appendWorkflowLogEvent(workflowRecord.id, { type: "raw", message: workflowRawMessage(event), payload: event });
        await stream.write("raw", event);
      }
    });
    await appendAppEvent("update_decisions_created", {
      projectRoot,
      title: decisions.title,
      decisionsCount: decisions.decisions.length
    });
    await appendWorkflowLogEvent(workflowRecord.id, { type: "complete", message: decisions.title, payload: { decisionsCount: decisions.decisions.length } });
    await stream.write("complete", { decisions });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await stream.write("error", { message: `Codex could not produce update decisions: ${message}` });
  } finally {
    stream.close();
  }
}));

router.post("/update", asyncHandler(async (req: Request, res: Response) => startPipeline("update", req, res)));

router.get("/jobs/current", asyncHandler(async (_req: Request, res: Response) => {
  res.json(jobManager.getCurrentJob());
}));

router.get("/jobs/:jobId/stream", asyncHandler(async (req: Request, res: Response) => {
  const jobId = String(req.params.jobId);
  const current = jobManager.getCurrentJob();
  const history = jobManager.getEvents(jobId);

  if (!current || current.id !== jobId) {
    res.status(404).json({ message: "Job not found" });
    return;
  }

  const stream = createSseStream(res);

  const writeEvent = (event: { type: string; data: Record<string, unknown>; seq: number }) => {
    void stream.write(event.type, event.data, event.seq);
  };

  for (const event of history) {
    await stream.write(event.type, event.data, event.seq);
  }
  const unsubscribe = jobManager.subscribe(jobId, writeEvent);

  req.on("close", () => {
    unsubscribe();
    stream.close();
  });
}));

router.get("/history", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json({ runs: await listRuns(projectRoot) });
}));

router.get("/history/projects", asyncHandler(async (_req: Request, res: Response) => {
  res.json({ projects: await listWorkLogProjects() });
}));

router.get("/history/board", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readWorkflowLogBoard(projectRoot));
}));

router.get("/history/records/:recordId", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readWorkflowLogRecord(projectRoot, String(req.params.recordId)));
}));

router.get("/history/:runName", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readRunDetail(projectRoot, String(req.params.runName)));
}));

router.post("/highlight", asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { code?: string; language?: string };
  const code = typeof body.code === "string" ? body.code : "";
  const language = normalizeHighlightLanguage(body.language);

  res.json({ html: await highlightCode(code, language), language });
}));

router.get("/settings/codex", asyncHandler(async (_req: Request, res: Response) => {
  res.json((await loadCodexSettings()).settings);
}));

router.put("/settings/codex", asyncHandler(async (req: Request, res: Response) => {
  await saveCodexSettings(req.body);
  res.status(204).end();
}));

router.get("/settings/codex/project", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readProjectCodexSettings(projectRoot));
}));

router.post("/settings/codex/project", asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { projectRoot?: string };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  res.json(await saveProjectCodexSettings(projectRoot));
}));

router.get("/settings/app", asyncHandler(async (_req: Request, res: Response) => {
  res.json(await loadAppConfig());
}));

router.put("/settings/app", asyncHandler(async (req: Request, res: Response) => {
  await saveAppConfig(req.body);
  res.status(204).end();
}));

router.get("/resources", asyncHandler(async (_req: Request, res: Response) => {
  res.json(await listResourceCatalog());
}));

export { router as apiRouter };
