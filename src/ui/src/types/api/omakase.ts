import type { ArchitectProgressEvent } from "@/types/api/architect";
import type { DesignProgressEvent } from "@/types/api/design";
import type { JobEvent, JobSnapshot } from "@/types/api/pipeline";

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
