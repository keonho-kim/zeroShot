import type { WorkflowLogSection, WorkflowLogStage } from "@backend/types/history";

export const stageSections: Record<WorkflowLogStage, WorkflowLogSection[]> = {
  product: ["blueprint", "decisions", "logs"],
  design: ["preview", "decisions", "logs"],
  build: ["decisions", "build-log"],
  update: ["request", "decisions", "update-log"]
};

export const stageOrder = Object.keys(stageSections) as WorkflowLogStage[];
