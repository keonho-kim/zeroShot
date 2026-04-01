import express, { type NextFunction, type Request, type RequestHandler, type Response, type Router } from "express";
import { loadAppConfig, saveAppConfig } from "../config/app-config.js";
import { loadCodexSettings, saveCodexSettings } from "../config/codex-config.js";
import { assertAllowedProjectRoot, listDirectoryEntries } from "../core/path-guards.js";
import { readAuthStatus } from "../services/auth-service.js";
import { readProjectFile, saveProjectFile, writeProductOrUpdate } from "../services/file-service.js";
import { readRunDetail, listRuns } from "../services/history-service.js";
import { jobManager } from "../services/job-manager.js";
import { readProjectState } from "../services/project-service.js";
import type { PipelineOptions, RunMode } from "../types.js";

const router: Router = express.Router();

function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function getValidatedProjectRoot(projectRoot: string): Promise<string> {
  const config = await loadAppConfig();
  return assertAllowedProjectRoot(projectRoot, config.allowedRoots);
}

router.get("/auth/status", asyncHandler(async (_req: Request, res: Response) => {
  res.json(await readAuthStatus());
}));

router.get("/projects/tree", asyncHandler(async (req: Request, res: Response) => {
  const config = await loadAppConfig();
  const targetPath = typeof req.query.path === "string" ? req.query.path : "";

  if (!targetPath) {
    const roots = await Promise.all(
      config.allowedRoots.map(async (root) => ({
        name: root,
        path: root,
        relativePath: "",
        isDirectory: true
      }))
    );
    res.json({ path: "", entries: roots });
    return;
  }

  const validated = await assertAllowedProjectRoot(targetPath, config.allowedRoots);
  const entries = await listDirectoryEntries(validated, validated, { directoriesOnly: true });
  res.json({ path: validated, entries });
}));

router.get("/projects/state", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readProjectState(projectRoot));
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

  if (typeof body.productContent === "string") {
    await writeProductOrUpdate(projectRoot, "PRODUCT.md", body.productContent);
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

router.get("/files", asyncHandler(async (req: Request, res: Response) => {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  const filePath = typeof req.query.path === "string" ? req.query.path : "";
  res.json(await readProjectFile(projectRoot, filePath));
}));

router.put("/files", asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { projectRoot: string; path: string; content: string };
  const projectRoot = await getValidatedProjectRoot(body.projectRoot);
  await saveProjectFile(projectRoot, body.path, body.content);
  res.status(204).end();
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
