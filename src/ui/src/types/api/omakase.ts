import type { ArchitectProgressEvent } from "./architect";
import type { DesignProgressEvent } from "./design";
import type { JobEvent, JobSnapshot } from "./pipeline";

export type OmakaseStage = "architect" | "design" | "build";

export interface OmakaseStagePayload {
  stage: OmakaseStage;
  title?: string;
  detail?: string;
  message?: string;
  event?: ArchitectProgressEvent | DesignProgressEvent;
  job?: JobSnapshot;
}

export interface OmakaseBuildLogPayload {
  event: JobEvent;
}
