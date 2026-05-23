import type { JobEvent, OmakaseStage } from "@/types/api";

export type OmakaseRunStatus = "idle" | "running" | "completed" | "failed";
export type OmakaseStageStatus = "idle" | "running" | "completed" | "failed";

export interface OmakaseProgressItem {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
}

export const omakaseStageOrder: OmakaseStage[] = ["architect", "design", "build"];

export const initialOmakaseStageStatuses: Record<OmakaseStage, OmakaseStageStatus> = {
  architect: "idle",
  design: "idle",
  build: "idle"
};

export function omakaseStageLabel(stage: OmakaseStage): string {
  return stage === "architect" ? "ARCHITECT" : stage === "design" ? "DESIGN" : "BUILD";
}

export function omakaseProjectName(projectRoot: string): string {
  return projectRoot.split("/").filter(Boolean).at(-1) || projectRoot;
}

export function buildLogText(event: JobEvent): string {
  if (typeof event.data.line === "string") {
    return event.data.line;
  }
  if (typeof event.data.phase === "string") {
    return event.data.phase;
  }
  if (typeof event.data.status === "string") {
    return event.data.status;
  }
  if (typeof event.data.message === "string") {
    return event.data.message;
  }
  return event.type;
}
