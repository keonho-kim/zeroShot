import { buildDesignRuntime, recommendDesignResources } from "@backend/services/design/service";
import { saveDesignRuntimeArtifacts } from "@backend/services/artifact-workflow/service";
import { appendWorkflowLogEvent, createWorkflowLogRecord } from "@backend/services/workflow-log/service";
import { omakaseDesignGoal } from "@backend/services/omakase/goals";
import { progressMessage } from "@backend/services/omakase/progress";
import { selectOmakaseDesignResources } from "@backend/services/omakase/selection";
import { writeStageCompleted, writeStageMessage, writeStageProgress, writeStageStarted } from "@backend/services/omakase/stream-writer";
import type { OmakaseRequest, OmakaseStream } from "@backend/services/omakase/types";

export async function runOmakaseDesignStage(params: {
  request: OmakaseRequest;
  brief: string;
  locale: string;
  stream: OmakaseStream;
}): Promise<void> {
  const { request, brief, locale, stream } = params;
  const designLog = await createWorkflowLogRecord({
    projectRoot: request.projectRoot,
    stage: "design",
    section: "logs",
    kind: "log",
    title: "OMAKASE DESIGN",
    summary: brief
  });
  await writeStageStarted(stream, "design", "Codex is exploring design systems and templates.");
  await appendWorkflowLogEvent(designLog.id, { type: "stage_started", message: "Codex is exploring design systems and templates." });
  const recommendations = await recommendDesignResources({
    projectRoot: request.projectRoot,
    locale,
    onProgress: async (event) => {
      await appendWorkflowLogEvent(designLog.id, { type: "progress", message: progressMessage(event), payload: event });
      await writeStageProgress(stream, "design", event);
    },
    onMessage: async (message) => {
      await appendWorkflowLogEvent(designLog.id, { type: "message", message, payload: { message } });
      await writeStageMessage(stream, "design", message);
    }
  });
  const { activeDesignSystemId, activeDesignTemplateId } = selectOmakaseDesignResources(recommendations);
  await writeStageMessage(stream, "design", "Codex selected the first recommended design system and template.");
  await appendWorkflowLogEvent(designLog.id, { type: "message", message: "Codex selected the first recommended design system and template." });
  const design = await buildDesignRuntime({
    projectRoot: request.projectRoot,
    mode: "codex",
    goal: omakaseDesignGoal(brief, recommendations),
    locale,
    activeDesignSystemId,
    activeDesignTemplateId,
    onProgress: async (event) => {
      await appendWorkflowLogEvent(designLog.id, { type: "progress", message: progressMessage(event), payload: event });
      await writeStageProgress(stream, "design", event);
    },
    onMessage: async (message) => {
      await appendWorkflowLogEvent(designLog.id, { type: "message", message, payload: { message } });
      await writeStageMessage(stream, "design", message);
    }
  });
  await saveDesignRuntimeArtifacts(request.projectRoot, "codex", design);
  await createWorkflowLogRecord({
    projectRoot: request.projectRoot,
    stage: "design",
    section: "decisions",
    kind: "decisions",
    title: "OMAKASE DESIGN decisions",
    summary: design.title,
    payload: {
      mode: "omakase",
      recommendations,
      activeDesignSystemId,
      activeDesignTemplateId
    }
  });
  await writeStageCompleted(stream, "design", "Design handoff is ready.", {
    activeDesignSystemId,
    activeDesignTemplateId
  });
  await appendWorkflowLogEvent(designLog.id, { type: "stage_completed", message: "Design handoff is ready." });
}
