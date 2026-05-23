import type { Request, Response } from "express";
import { createSseStream } from "@backend/core/sse";
import { normalizeLocale } from "@backend/i18n/locale";
import { saveDesignRuntimeArtifacts } from "@backend/services/artifact-workflow-service";
import { readAuthStatus } from "@backend/services/auth-service";
import { buildDesignRuntime } from "@backend/services/design/service";
import { readProjectState } from "@backend/services/project-service";
import { appendWorkflowLogEvent, createWorkflowLogRecord } from "@backend/services/workflow-log-service";
import type { DesignProgressEvent } from "@backend/types/design";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";
import { workflowProgressMessage, workflowRawMessage } from "@backend/routes/shared/workflow";
import { toDesignRuntimeMode } from "@backend/routes/design/shared";

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
