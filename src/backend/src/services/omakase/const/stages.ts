import type { OmakaseStage } from "@backend/services/omakase/types";

export const omakaseStages: OmakaseStage[] = ["architect", "design", "build"];

export function stageTitle(stage: OmakaseStage): string {
  return stage === "architect" ? "ARCHITECT" : stage === "design" ? "DESIGN" : "BUILD";
}
