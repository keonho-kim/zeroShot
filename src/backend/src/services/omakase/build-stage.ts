import { jobManager } from "@backend/services/job/service";
import { startPipelineRun } from "@backend/services/pipeline-run/service";
import { readProjectState } from "@backend/services/project/service";
import { writeStageCompleted, writeStageMessage, writeStageStarted } from "@backend/services/omakase/stream-writer";
import type { OmakaseRequest, OmakaseStream } from "@backend/services/omakase/types";
import type { JobEvent, JobSnapshot } from "@backend/types/pipeline";

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

export async function runOmakaseBuildStage(request: OmakaseRequest, stream: OmakaseStream): Promise<JobSnapshot> {
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
  return finishedJob;
}
