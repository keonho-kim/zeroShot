import type { JobSnapshot, OmakaseBuildLogPayload, OmakaseStagePayload, PipelineOptions } from "@/types/api";
import { apiRoutes } from "@/lib/api/const/routes";
import { postStream } from "@/lib/api/stream";

export async function requestOmakaseStream(
  payload: {
    projectRoot: string;
    brief: string;
    locale: string;
    options?: PipelineOptions;
  },
  handlers: {
    onStageStarted?: (payload: OmakaseStagePayload) => void;
    onStageProgress?: (payload: OmakaseStagePayload) => void;
    onStageMessage?: (payload: OmakaseStagePayload) => void;
    onStageCompleted?: (payload: OmakaseStagePayload) => void;
    onStageFailed?: (payload: OmakaseStagePayload) => void;
    onBuildLog?: (payload: OmakaseBuildLogPayload) => void;
  }
) {
  return postStream(
    apiRoutes.omakaseStream,
    payload,
    "Omakase request failed.",
    "Omakase stream is unavailable.",
    "Omakase stream ended before completion.",
    (event, data) => {
      if (event === "stage_started") {
        handlers.onStageStarted?.(data as OmakaseStagePayload);
      }
      if (event === "stage_progress") {
        handlers.onStageProgress?.(data as OmakaseStagePayload);
      }
      if (event === "stage_message") {
        handlers.onStageMessage?.(data as OmakaseStagePayload);
      }
      if (event === "stage_completed") {
        handlers.onStageCompleted?.(data as OmakaseStagePayload);
      }
      if (event === "stage_failed") {
        handlers.onStageFailed?.(data as OmakaseStagePayload);
      }
      if (event === "build_log") {
        handlers.onBuildLog?.(data as OmakaseBuildLogPayload);
      }
      if (event === "complete") {
        return (data as { job: JobSnapshot }).job;
      }
      if (event === "error") {
        throw new Error((data as { message: string }).message);
      }
      return undefined;
    }
  );
}
