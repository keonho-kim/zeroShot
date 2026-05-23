import type { Request, Response } from "express";
import { createSseStream } from "@backend/core/sse.js";
import { normalizeLocale } from "@backend/i18n/locale.js";
import { saveDesignRuntimeArtifacts } from "@backend/services/artifact-workflow-service.js";
import { readAuthStatus } from "@backend/services/auth-service.js";
import { buildDesignRuntime } from "@backend/services/design-service.js";
import { readProjectState } from "@backend/services/project-service.js";
import { appendWorkflowLogEvent, createWorkflowLogRecord } from "@backend/services/workflow-log-service.js";
import type { DesignProgressEvent } from "@backend/types.js";
import { getValidatedProjectRoot } from "../shared/project-root.js";
import { workflowProgressMessage, workflowRawMessage } from "../shared/workflow.js";
import { toDesignRuntimeMode } from "./shared.js";

export async function postDesignRuntimeStream(req: Request, res: Response) {
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
}
