import type { ArchitectDecision, ArchitectDecisionResponse, ArchitectProgressEvent, BootstrapResult, ProductArtifactFile } from "@/types/api";
import { client } from "@/lib/api/client";
import { apiRoutes } from "@/lib/api/const/routes";
import { formatRawCodexEvent, postStream } from "@/lib/api/stream";

export async function requestArchitectDecisions(payload: {
  projectRoot: string;
  goal: string;
  locale: string;
  activeSkillId?: string;
  activeDesignTemplateId?: string;
  activeDesignSystemId?: string;
}) {
  return (await client.post<ArchitectDecisionResponse>(apiRoutes.architectDecisions, payload)).data;
}

export async function requestArchitectDecisionsStream(
  payload: {
    projectRoot: string;
    goal: string;
    locale: string;
    activeSkillId?: string;
    activeDesignTemplateId?: string;
    activeDesignSystemId?: string;
  },
  onProgress: (event: ArchitectProgressEvent) => void,
  onMessage?: (message: string) => void,
  onRaw?: (message: string) => void
) {
  return postStream(
    apiRoutes.architectDecisionsStream,
    payload,
    "Architect request failed.",
    "Architect stream is unavailable.",
    "Architect stream ended before decisions were returned.",
    (event, data) => {
      if (event === "progress") {
        onProgress(data as ArchitectProgressEvent);
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
        return (data as { decisions: ArchitectDecisionResponse }).decisions;
      }
      if (event === "error") {
        throw new Error((data as { message: string }).message);
      }
      return undefined;
    }
  );
}

export async function runArchitectBootstrap(payload: {
  projectRoot: string;
  answers: Record<string, string>;
  decisions: ArchitectDecision[];
}) {
  return (await client.post<BootstrapResult>(apiRoutes.architectBootstrap, payload)).data;
}

export async function createArchitectProductHtml(payload: {
  projectRoot: string;
  userBrief: string;
  decisionSet: ArchitectDecisionResponse;
  answers: Record<string, string>;
  locale: string;
  activeSkillId?: string;
  activeDesignTemplateId?: string;
  activeDesignSystemId?: string;
}) {
  return (await client.post<ProductArtifactFile>(apiRoutes.architectProductHtml, payload)).data;
}

export async function createArchitectProductHtmlStream(
  payload: {
    projectRoot: string;
    userBrief: string;
    decisionSet: ArchitectDecisionResponse;
    answers: Record<string, string>;
    locale: string;
    activeSkillId?: string;
    activeDesignTemplateId?: string;
    activeDesignSystemId?: string;
  },
  onProgress: (event: ArchitectProgressEvent) => void,
  onMessage?: (message: string) => void,
  onRaw?: (message: string) => void
) {
  return postStream(
    apiRoutes.architectProductHtmlStream,
    payload,
    "PRODUCT.html request failed.",
    "PRODUCT.html stream is unavailable.",
    "PRODUCT.html stream ended before a file was returned.",
    (event, data) => {
      if (event === "progress") {
        onProgress(data as ArchitectProgressEvent);
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
        return (data as { file: ProductArtifactFile }).file;
      }
      if (event === "error") {
        throw new Error((data as { message: string }).message);
      }
      return undefined;
    }
  );
}
