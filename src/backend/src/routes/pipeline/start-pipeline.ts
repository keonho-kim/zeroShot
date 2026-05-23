import type { Request, Response } from "express";
import { readAuthStatus } from "@backend/services/auth-service";
import { writeProductHtml, writeUpdateDocument } from "@backend/services/file-service";
import { startPipelineRun } from "@backend/services/pipeline-run-service";
import { readProjectState } from "@backend/services/project-service";
import { createWorkflowLogRecord } from "@backend/services/workflow-log-service";
import type { PipelineOptions, RunMode } from "@backend/types/pipeline";
import { productContentToHtml, appendActiveResourceContext } from "@backend/routes/shared/product-content";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";

export async function startPipeline(mode: RunMode, req: Request, res: Response) {
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
