import type { DesignProgressEvent, DesignRecommendationResponse, DesignRuntimeMode, DesignRuntimeResponse } from "@/types/api";
import { client } from "@/lib/api/client";
import { apiRoutes } from "@/lib/api/const/routes";
import { formatRawCodexEvent, postStream } from "@/lib/api/stream";

export async function fetchLatestDesign(projectRoot: string) {
  return (await client.get<DesignRuntimeResponse | null>(apiRoutes.designLatest, { params: { projectRoot } })).data;
}

export async function requestDesignRuntimeStream(
  payload: {
    projectRoot: string;
    mode: DesignRuntimeMode;
    goal: string;
    locale: string;
    activeSkillId?: string;
    activeDesignTemplateId?: string;
    activeDesignSystemId?: string;
  },
  onProgress: (event: DesignProgressEvent) => void,
  onMessage?: (message: string) => void,
  onRaw?: (message: string) => void
) {
  return postStream(
    apiRoutes.designRuntimeStream,
    payload,
    "Design runtime request failed.",
    "Design runtime stream is unavailable.",
    "Design runtime stream ended before a design response was returned.",
    (event, data) => {
      if (event === "progress") {
        onProgress(data as DesignProgressEvent);
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
        return (data as { design: DesignRuntimeResponse }).design;
      }
      if (event === "error") {
        throw new Error((data as { message: string }).message);
      }
      return undefined;
    }
  );
}

export async function requestDesignRecommendationsStream(
  payload: {
    projectRoot: string;
    locale: string;
  },
  onProgress: (event: DesignProgressEvent) => void,
  onMessage?: (message: string) => void,
  onRaw?: (message: string) => void
) {
  return postStream(
    apiRoutes.designRecommendationsStream,
    payload,
    "Design recommendation request failed.",
    "Design recommendation stream is unavailable.",
    "Design recommendation stream ended before recommendations were returned.",
    (event, data) => {
      if (event === "progress") {
        onProgress(data as DesignProgressEvent);
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
        return (data as { recommendations: DesignRecommendationResponse }).recommendations;
      }
      if (event === "error") {
        throw new Error((data as { message: string }).message);
      }
      return undefined;
    }
  );
}
