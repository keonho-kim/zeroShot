import express, { type NextFunction, type Request, type RequestHandler, type Response, type Router } from "express";
import { stat } from "node:fs/promises";
import { basename, relative } from "node:path";
import { loadAppConfig, saveAppConfig } from "../config/app-config.js";
import { loadCodexSettings, saveCodexSettings } from "../config/codex-config.js";
import { assertPathWithinRoots, isWithin, listDirectoryEntries } from "../core/path-guards.js";
import { readAuthStatus, saveAuthFile } from "../services/auth-service.js";
import { buildArchitectDecisions, type ArchitectProgressEvent } from "../services/architect-service.js";
import { createDirectory, deleteEntry, readProductHtml, writeProductHtml, writeProductOrUpdate } from "../services/file-service.js";
import { readRunDetail, listRuns } from "../services/history-service.js";
import { jobManager } from "../services/job-manager.js";
import { readProjectHistoryMeta, readProjectState } from "../services/project-service.js";
import type { PipelineOptions, RunMode } from "../types.js";

const router: Router = express.Router();

function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function getValidatedProjectRoot(projectRoot: string): Promise<string> {
  const config = await loadAppConfig();
  return assertPathWithinRoots(projectRoot, getBrowsableRoots(config), "browsable roots");
}

function getBrowsableRoots(config: Awaited<ReturnType<typeof loadAppConfig>>): string[] {
  return Array.from(new Set([...config.bootstrapRoots, ...config.allowedRoots]));
}

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\.$/, "");
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
    directoriesOnly: true,
    hideHidden: true,
    allowedRoots: config.allowedRoots
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

router.get("/projects/product-html", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.type("html").send(await readProductHtml(projectRoot));
}));

router.post("/architect/decisions", asyncHandler(async (req: Request, res: Response) => {
  const auth = await readAuthStatus();
  if (!auth.valid) {
    res.status(412).json(auth);
    return;
  }

  const body = req.body as { projectRoot?: string; goal?: string; locale?: string; model?: string };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  if (typeof body.goal !== "string" || !body.goal.trim()) {
    res.status(400).json({ message: "Architect goal is required" });
    return;
  }

  try {
    const decisions = await buildArchitectDecisions({
      projectRoot,
      goal: body.goal.trim(),
      locale: body.locale === "ko" ? "ko" : "en",
      reasoning: (await loadAppConfig()).defaults.planReasoning,
      model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : undefined
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

  const body = req.body as { projectRoot?: string; goal?: string; locale?: string; model?: string };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  if (typeof body.goal !== "string" || !body.goal.trim()) {
    res.status(400).json({ message: "Architect goal is required" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });

  let seq = 0;
  const writeEvent = (type: string, data: object) => {
    seq += 1;
    res.write(`id: ${seq}\n`);
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const decisions = await buildArchitectDecisions({
      projectRoot,
      goal: body.goal.trim(),
      locale: body.locale === "ko" ? "ko" : "en",
      reasoning: (await loadAppConfig()).defaults.planReasoning,
      model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : undefined,
      onProgress: (event: ArchitectProgressEvent) => writeEvent("progress", event)
    });
    writeEvent("complete", { decisions });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeEvent("error", { message: `Codex could not produce architect decisions: ${message}` });
  } finally {
    res.end();
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
  if (typeof body.markdownMirror === "string" && body.markdownMirror.trim()) {
    await writeProductOrUpdate(projectRoot, "PRODUCT.md", body.markdownMirror);
  }
  res.status(204).end();
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
    options?: PipelineOptions;
  };
  const projectRoot = await getValidatedProjectRoot(body.projectRoot);
  const projectState = await readProjectState(projectRoot);

  if (mode === "build" && !projectState.buildEnabled) {
    res.status(409).json({ message: "BUILD needs a non-empty workspace or PRODUCT.html." });
    return;
  }

  if (typeof body.productContent === "string") {
    await writeProductOrUpdate(projectRoot, "PRODUCT.md", body.productContent);
  } else if (mode === "build" && projectState.hasProductHtml && !projectState.hasProduct) {
    const productHtml = await readProductHtml(projectRoot);
    await writeProductOrUpdate(
      projectRoot,
      "PRODUCT.md",
      [
        "# PRODUCT",
        "",
        "This PRODUCT.md was generated from PRODUCT.html.",
        "Use PRODUCT.html as the canonical interactive blueprint and this markdown file as the Codex pipeline input.",
        "",
        "## Blueprint HTML",
        "```html",
        productHtml,
        "```",
        ""
      ].join("\n")
    );
  }
  if (mode === "update" && typeof body.updateContent === "string") {
    await writeProductOrUpdate(projectRoot, "UPDATE.md", body.updateContent);
  }

  const job = await jobManager.start(mode, projectRoot, body.options);
  res.status(202).json(job);
}

router.post("/build", asyncHandler(async (req: Request, res: Response) => startPipeline("build", req, res)));
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

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });

  const writeEvent = (event: { type: string; data: Record<string, unknown>; seq: number }) => {
    res.write(`id: ${event.seq}\n`);
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event.data)}\n\n`);
  };

  history.forEach(writeEvent);
  const unsubscribe = jobManager.subscribe(jobId, writeEvent);

  req.on("close", () => {
    unsubscribe();
    res.end();
  });
}));

router.get("/history", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json({ runs: await listRuns(projectRoot) });
}));

router.get("/history/:runName", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readRunDetail(projectRoot, String(req.params.runName)));
}));

router.get("/settings/codex", asyncHandler(async (_req: Request, res: Response) => {
  res.json((await loadCodexSettings()).settings);
}));

router.put("/settings/codex", asyncHandler(async (req: Request, res: Response) => {
  await saveCodexSettings(req.body);
  res.status(204).end();
}));

router.get("/settings/app", asyncHandler(async (_req: Request, res: Response) => {
  res.json(await loadAppConfig());
}));

router.put("/settings/app", asyncHandler(async (req: Request, res: Response) => {
  await saveAppConfig(req.body);
  res.status(204).end();
}));

export { router as apiRouter };
