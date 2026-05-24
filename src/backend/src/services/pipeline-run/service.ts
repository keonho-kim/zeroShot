import { appendAppEvent } from "@backend/services/event-log/service";
import { jobManager } from "@backend/services/job/service";
import { createWorkflowLogRecord } from "@backend/services/workflow-log/service";
import type { PipelineOptions, RunMode } from "@backend/types/pipeline";

export async function startPipelineRun(mode: RunMode, projectRoot: string, options?: PipelineOptions) {
  if (mode === "build") {
    await createWorkflowLogRecord({
      projectRoot,
      stage: "build",
      section: "decisions",
      kind: "context",
      title: "BUILD context",
      summary: "Build started from the selected product and design state.",
      payload: { mode, options: options ?? {} }
    });
  }
  const logRecord = await createWorkflowLogRecord({
    projectRoot,
    stage: mode === "build" ? "build" : "update",
    section: mode === "build" ? "build-log" : "update-log",
    kind: "log",
    title: `${mode.toUpperCase()} log`,
    summary: `${mode.toUpperCase()} job event stream.`
  });
  const job = await jobManager.start(mode, projectRoot, options, logRecord.id);
  await appendAppEvent("pipeline_started", { projectRoot, mode, jobId: job.id });
  return job;
}
