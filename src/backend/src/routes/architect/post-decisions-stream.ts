import type { Request, Response } from "express";
import { loadAppConfig } from "@backend/config/app-config";
import { createSseStream } from "@backend/core/sse";
import { normalizeLocale } from "@backend/i18n/locale";
import { buildArchitectDecisions, type ArchitectProgressEvent } from "@backend/services/architect/service";
import { recordArchitectSession } from "@backend/services/app-storage/service";
import { readAuthStatus } from "@backend/services/auth/service";
import { appendAppEvent } from "@backend/services/event-log/service";
import { buildResourcePromptContext } from "@backend/services/resource/service";
import { appendWorkflowLogEvent, createWorkflowLogRecord } from "@backend/services/workflow-log/service";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";
import { workflowProgressMessage, workflowRawMessage } from "@backend/routes/shared/workflow";

export async function postArchitectDecisionsStream(req: Request, res: Response) {
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
}
