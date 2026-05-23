import { loadAppConfig } from "@backend/config/app-config.js";
import { normalizeLocale } from "@backend/i18n/locale.js";
import { buildArchitectDecisions, buildArchitectProductHtml, type ArchitectDecisionResponse, type ArchitectProgressEvent } from "@backend/services/architect-service.js";
import { recordArchitectSession } from "@backend/services/app-storage-service.js";
import { saveArchitectProductFiles, saveDesignRuntimeArtifacts } from "@backend/services/artifact-workflow-service.js";
import { inferBootstrapRequest, runBootstrap } from "@backend/services/bootstrap-service.js";
import { buildDesignRuntime, recommendDesignResources } from "@backend/services/design-service.js";
import { jobManager } from "@backend/services/job-manager.js";
import { startPipelineRun } from "@backend/services/pipeline-run-service.js";
import { readProjectState } from "@backend/services/project-service.js";
import { buildResourcePromptContext } from "@backend/services/resource-service.js";
import { appendWorkflowLogEvent, createWorkflowLogRecord } from "@backend/services/workflow-log-service.js";
import type {
  DesignProgressEvent,
  DesignRecommendationResponse
} from "@backend/types/design.js";
import type {
  JobEvent,
  JobSnapshot,
  PipelineOptions
} from "@backend/types/pipeline.js";

export type OmakaseStage = "architect" | "design" | "build";

export const omakaseStages: OmakaseStage[] = ["architect", "design", "build"];

export interface OmakaseStream {
  write: (type: string, data: unknown, id?: number) => Promise<void>;
}

export interface OmakaseRequest {
  projectRoot: string;
  brief: string;
  locale?: string;
  options?: PipelineOptions;
}

type StageProgressEvent = ArchitectProgressEvent | DesignProgressEvent;

function progressMessage(event: StageProgressEvent): string {
  return [event.title, event.detail, event.status].filter(Boolean).join(" · ");
}

function stageTitle(stage: OmakaseStage): string {
  return stage === "architect" ? "ARCHITECT" : stage === "design" ? "DESIGN" : "BUILD";
}

async function writeStageStarted(stream: OmakaseStream, stage: OmakaseStage, detail: string) {
  await stream.write("stage_started", { stage, title: stageTitle(stage), detail });
}

async function writeStageProgress(stream: OmakaseStream, stage: OmakaseStage, event: StageProgressEvent) {
  await stream.write("stage_progress", { stage, event });
}

async function writeStageMessage(stream: OmakaseStream, stage: OmakaseStage, message: string) {
  if (!message.trim()) {
    return;
  }
  await stream.write("stage_message", { stage, message });
}

async function writeStageCompleted(stream: OmakaseStream, stage: OmakaseStage, detail: string, extra: Record<string, unknown> = {}) {
  await stream.write("stage_completed", { stage, title: stageTitle(stage), detail, ...extra });
}

async function writeStageFailed(stream: OmakaseStream, stage: OmakaseStage, message: string) {
  await stream.write("stage_failed", { stage, title: stageTitle(stage), message });
}

export function selectRecommendedArchitectAnswers(decisions: ArchitectDecisionResponse["decisions"]): Record<string, string> {
  return Object.fromEntries(decisions.map((decision) => [decision.id, decision.options[0]?.id ?? ""]));
}

export function selectOmakaseDesignResources(recommendations: DesignRecommendationResponse) {
  return {
    activeDesignSystemId: recommendations.designSystems[0]?.resourceId,
    activeDesignTemplateId: recommendations.designTemplates[0]?.resourceId
  };
}

function omakaseArchitectGoal(brief: string): string {
  return [
    brief.trim(),
    "",
    "OMAKASE MODE is enabled.",
    "Proceed with the optimal judgment yourself. Do not ask the user to choose between options.",
    "For every decision, put the option you judge best as the first option so ZeroShot can automatically select it.",
    "Choose a coherent path that can proceed through ARCHITECT, DESIGN, and BUILD."
  ].join("\n");
}

function omakaseDesignGoal(brief: string, recommendations: DesignRecommendationResponse): string {
  const designSystem = recommendations.designSystems[0]?.label ?? "the recommended design system";
  const designTemplate = recommendations.designTemplates[0]?.label ?? "the recommended design template";
  return [
    brief.trim(),
    "",
    "OMAKASE MODE is enabled.",
    "Use the product blueprint and make the optimal design judgment yourself.",
    `Use the recommended design system: ${designSystem}.`,
    `Use the recommended design template: ${designTemplate}.`,
    "Create a concrete design handoff that is ready for BUILD."
  ].join("\n");
}

function finishedJobStatus(event: JobEvent): "completed" | "failed" | null {
  if (event.type === "job_finished") {
    return "completed";
  }
  if (event.type === "job_failed") {
    return "failed";
  }
  return null;
}

async function forwardBuildEvents(stream: OmakaseStream, job: JobSnapshot): Promise<JobSnapshot> {
  let resolved = false;

  const writeEvent = async (event: JobEvent) => {
    await stream.write("build_log", { event }, event.seq);
  };

  for (const event of jobManager.getEvents(job.id)) {
    await writeEvent(event);
  }

  const existingFinish = jobManager.getEvents(job.id).find((event) => finishedJobStatus(event));
  if (existingFinish) {
    const status = finishedJobStatus(existingFinish) ?? "failed";
    return { ...job, status };
  }

  return new Promise((resolve) => {
    const unsubscribe = jobManager.subscribe(job.id, (event) => {
      void writeEvent(event);
      const status = finishedJobStatus(event);
      if (!status || resolved) {
        return;
      }
      resolved = true;
      unsubscribe();
      resolve({
        ...job,
        status,
        exitCode: typeof event.data.exitCode === "number" ? event.data.exitCode : status === "completed" ? 0 : 1,
        finishedAt: new Date().toISOString()
      });
    });
  });
}

export async function runOmakasePipeline(request: OmakaseRequest, stream: OmakaseStream) {
  const locale = normalizeLocale(request.locale);
  const brief = request.brief.trim();
  const appConfig = await loadAppConfig();

  let activeStage: OmakaseStage = "architect";
  try {
    activeStage = "architect";
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
    const decisionSet = await buildArchitectDecisions({
      projectRoot: request.projectRoot,
      goal: omakaseArchitectGoal(brief),
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
      goal: omakaseArchitectGoal(brief),
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

    activeStage = "design";
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

    activeStage = "build";
    await writeStageStarted(stream, "build", "Codex is starting BUILD.");
    const projectState = await readProjectState(request.projectRoot);
    if (!projectState.buildEnabled) {
      throw new Error("BUILD needs a product blueprint or non-empty workspace.");
    }
    const job = await startPipelineRun("build", request.projectRoot, request.options);
    await writeStageMessage(stream, "build", "BUILD job started.");
    const finishedJob = await forwardBuildEvents(stream, job);
    if (finishedJob.status === "failed") {
      throw new Error("BUILD failed.");
    }
    await writeStageCompleted(stream, "build", "BUILD completed.", { job: finishedJob });
    await stream.write("complete", { job: finishedJob });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeStageFailed(stream, activeStage, message);
    await stream.write("error", { message });
  }
}
