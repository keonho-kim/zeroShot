import type { JobSnapshot, PipelineOptions, UpdateDecisionResponse, UpdateProgressEvent } from "@/types/api";
import { client } from "@/lib/api/client";
import { apiRoutes } from "@/lib/api/const/routes";
import { formatRawCodexEvent, postStream } from "@/lib/api/stream";

export async function requestUpdateDecisionsStream(
  payload: {
    projectRoot: string;
    updateRequest: string;
    locale: string;
  },
  onProgress: (event: UpdateProgressEvent) => void,
  onMessage?: (message: string) => void,
  onRaw?: (message: string) => void
) {
  return postStream(
    apiRoutes.updateDecisionsStream,
    payload,
    "Update decision request failed.",
    "Update decision stream is unavailable.",
    "Update decision stream ended before decisions were returned.",
    (event, data) => {
      if (event === "progress") {
        onProgress(data as UpdateProgressEvent);
      }
      if (event === "message") {
        const payload = data as { message?: unknown };
        if (typeof payload.message === "string") {
          onMessage?.(payload.message);
        }
      }
      if (event === "raw") {
        onRaw?.(formatRawCodexEvent(data));
      }
      if (event === "complete") {
        return (data as { decisions: UpdateDecisionResponse }).decisions;
      }
      if (event === "error") {
        throw new Error((data as { message: string }).message);
      }
      return undefined;
    }
  );
}

export async function startUpdate(payload: {
  projectRoot: string;
  updateContent: string;
  updateRequest?: string;
  updateDecisionSet?: UpdateDecisionResponse;
  updateAnswers?: Record<string, string>;
  options?: PipelineOptions;
}) {
  return (await client.post<JobSnapshot>(apiRoutes.update, payload)).data;
}
