import type { translate } from "@/lib/i18n-core";
import type { WorkflowLogSection, WorkflowLogStage } from "@/types/api";

type I18nKey = Parameters<typeof translate>[1];

export const workflowStageOrder: WorkflowLogStage[] = ["product", "design", "build", "update"];

export const workflowStageLabelKeys: Record<WorkflowLogStage, I18nKey> = {
  product: "log.stage.product",
  design: "log.stage.design",
  build: "log.stage.build",
  update: "log.stage.update"
};

export const workflowSectionLabelKeys: Record<WorkflowLogSection, I18nKey> = {
  blueprint: "log.section.blueprint",
  preview: "log.section.preview",
  decisions: "log.section.decisions",
  logs: "log.section.logs",
  "build-log": "log.section.buildLog",
  request: "log.section.request",
  "update-log": "log.section.updateLog"
};
