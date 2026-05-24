import { buildArchitectDecisions, buildArchitectProductHtml, type ArchitectDecisionResponse } from "@backend/services/architect/service";
import { recordArchitectSession } from "@backend/services/app-storage/service";
import { saveArchitectProductFiles } from "@backend/services/artifact-workflow/service";
import { inferBootstrapRequest, runBootstrap } from "@backend/services/bootstrap/service";
import { buildResourcePromptContext } from "@backend/services/resource/service";
import { appendWorkflowLogEvent, createWorkflowLogRecord } from "@backend/services/workflow-log/service";
import { omakaseArchitectGoal } from "@backend/services/omakase/goals";
import { progressMessage } from "@backend/services/omakase/progress";
import { selectRecommendedArchitectAnswers } from "@backend/services/omakase/selection";
import { writeStageCompleted, writeStageMessage, writeStageProgress, writeStageStarted } from "@backend/services/omakase/stream-writer";
import type { OmakaseRequest, OmakaseStream } from "@backend/services/omakase/types";
import type { AppConfig } from "@backend/types/app";

export async function runOmakaseArchitectStage(params: {
  request: OmakaseRequest;
  brief: string;
  locale: string;
  appConfig: AppConfig;
  stream: OmakaseStream;
}): Promise<{ decisionSet: ArchitectDecisionResponse; answers: Record<string, string> }> {
  const { request, brief, locale, appConfig, stream } = params;
  const architectLog = await createWorkflowLogRecord({
    projectRoot: request.projectRoot,
    stage: "product",
    section: "logs",
    kind: "log",
    title: "OMAKASE ARCHITECT",
    summary: brief
  });
  await writeStageStarted(stream, "architect", "Codex is planning the product and selecting the best path.");
  await appendWorkflowLogEvent(architectLog.id, { type: "stage_started", message: "Codex is planning the product and selecting the best path." });

  const goal = omakaseArchitectGoal(brief);
  const decisionSet = await buildArchitectDecisions({
    projectRoot: request.projectRoot,
    goal,
    locale,
    reasoning: appConfig.defaults.planReasoning,
    additionalDirectories: [appConfig.resourceRoots.skills, appConfig.resourceRoots.designTemplates, appConfig.resourceRoots.designSystems],
    resourceContext: await buildResourcePromptContext({ includeCatalogSummary: true }),
    onProgress: async (event) => {
      await appendWorkflowLogEvent(architectLog.id, { type: "progress", message: progressMessage(event), payload: event });
      await writeStageProgress(stream, "architect", event);
    },
    onMessage: async (message) => {
      await appendWorkflowLogEvent(architectLog.id, { type: "message", message, payload: { message } });
      await writeStageMessage(stream, "architect", message);
    }
  });
  const answers = selectRecommendedArchitectAnswers(decisionSet.decisions);
  await recordArchitectSession({
    projectRoot: request.projectRoot,
    goal,
    title: decisionSet.title,
    summary: decisionSet.summary,
    decisions: decisionSet
  });
  await createWorkflowLogRecord({
    projectRoot: request.projectRoot,
    stage: "product",
    section: "decisions",
    kind: "decisions",
    title: decisionSet.title,
    summary: decisionSet.summary,
    payload: {
      mode: "omakase",
      decisionSet,
      answers
    }
  });
  await writeStageMessage(stream, "architect", "Codex selected the recommended architecture choices.");
  await appendWorkflowLogEvent(architectLog.id, { type: "message", message: "Codex selected the recommended architecture choices." });
  await runBootstrap(inferBootstrapRequest({
    projectRoot: request.projectRoot,
    answers,
    decisions: decisionSet.decisions
  }));
  await writeStageMessage(stream, "architect", "Initial project structure is ready.");
  await appendWorkflowLogEvent(architectLog.id, { type: "message", message: "Initial project structure is ready." });

  const productFiles = await buildArchitectProductHtml({
    projectRoot: request.projectRoot,
    userBrief: brief,
    decisionSet,
    answers,
    locale,
    reasoning: appConfig.defaults.planReasoning,
    additionalDirectories: [appConfig.resourceRoots.skills, appConfig.resourceRoots.designTemplates, appConfig.resourceRoots.designSystems],
    resourceContext: await buildResourcePromptContext({ includeCatalogSummary: true }),
    onProgress: async (event) => {
      await appendWorkflowLogEvent(architectLog.id, { type: "progress", message: progressMessage(event), payload: event });
      await writeStageProgress(stream, "architect", event);
    },
    onMessage: async (message) => {
      await appendWorkflowLogEvent(architectLog.id, { type: "message", message, payload: { message } });
      await writeStageMessage(stream, "architect", message);
    }
  });
  await saveArchitectProductFiles(request.projectRoot, productFiles);
  await writeStageCompleted(stream, "architect", "Product blueprint and project structure are ready.");
  await appendWorkflowLogEvent(architectLog.id, { type: "stage_completed", message: "Product blueprint and project structure are ready." });
  return { decisionSet, answers };
}
