import type { Request, Response } from "express";
import { loadAppConfig } from "@backend/config/app-config.js";
import { createSseStream } from "@backend/core/sse.js";
import { normalizeLocale } from "@backend/i18n/locale.js";
import { buildArchitectProductHtml, type ArchitectProgressEvent } from "@backend/services/architect-service.js";
import { saveArchitectProductFiles } from "@backend/services/artifact-workflow-service.js";
import { readAuthStatus } from "@backend/services/auth-service.js";
import { buildResourcePromptContext } from "@backend/services/resource-service.js";
import { appendWorkflowLogEvent, createWorkflowLogRecord } from "@backend/services/workflow-log-service.js";
import { getValidatedProjectRoot } from "../shared/project-root.js";
import { workflowProgressMessage, workflowRawMessage } from "../shared/workflow.js";

export async function postArchitectProductHtmlStream(req: Request, res: Response) {
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
}
