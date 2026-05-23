import { appendAppEvent } from "@backend/services/event-log-service.js";
import { jobManager } from "@backend/services/job-manager.js";
import type { PipelineOptions, RunMode } from "@backend/types.js";

export async function startPipelineRun(mode: RunMode, projectRoot: string, options?: PipelineOptions) {
  const job = await jobManager.start(mode, projectRoot, options);
  await appendAppEvent("pipeline_started", { projectRoot, mode, jobId: job.id });
  return job;
}
