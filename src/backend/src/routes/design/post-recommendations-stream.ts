import type { Request, Response } from "express";
import { createSseStream } from "@backend/core/sse";
import { normalizeLocale } from "@backend/i18n/locale";
import { readAuthStatus } from "@backend/services/auth/service";
import { recommendDesignResources } from "@backend/services/design/service";
import { readProjectState } from "@backend/services/project/service";
import { appendWorkflowLogEvent, createWorkflowLogRecord } from "@backend/services/workflow-log/service";
import type { DesignProgressEvent } from "@backend/types/design";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";
import { workflowProgressMessage, workflowRawMessage } from "@backend/routes/shared/workflow";

export async function postDesignRecommendationsStream(req: Request, res: Response) {
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
}
