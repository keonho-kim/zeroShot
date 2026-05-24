import type { ArchitectProgressEvent } from "@backend/services/architect/service";
import type { DesignProgressEvent } from "@backend/types/design";
import type { PipelineOptions } from "@backend/types/pipeline";

export type OmakaseStage = "architect" | "design" | "build";

export interface OmakaseStream {
  write: (type: string, data: unknown, id?: number) => Promise<void>;
}

export interface OmakaseRequest {
  projectRoot: string;
  brief: string;
  locale?: string;
  options?: PipelineOptions;
}

export type StageProgressEvent = ArchitectProgressEvent | DesignProgressEvent;
