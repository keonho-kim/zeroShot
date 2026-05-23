import type { Request, Response } from "express";
import { loadAppConfig } from "@backend/config/app-config";
import { createSseStream } from "@backend/core/sse";
import { normalizeLocale } from "@backend/i18n/locale";
import { readAuthStatus } from "@backend/services/auth/service";
import { appendAppEvent } from "@backend/services/event-log/service";
import { readProjectState } from "@backend/services/project/service";
import { buildUpdateDecisions, type UpdateProgressEvent } from "@backend/services/update/service";
import { appendWorkflowLogEvent, createWorkflowLogRecord } from "@backend/services/workflow-log/service";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";
import { workflowProgressMessage, workflowRawMessage } from "@backend/routes/shared/workflow";

export async function postUpdateDecisionsStream(req: Request, res: Response) {
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
}
