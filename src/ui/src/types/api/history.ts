export interface RunSummary {
  name: string;
  path: string;
  createdAt?: string;
  mode?: string;
}

export interface RunDetail {
  summary: RunSummary;
  meta: Record<string, string>;
  manifest: string;
  documents: Record<string, string>;
}

export interface WorkLogProjectSummary {
  projectRoot: string;
  name: string;
  runsCount: number;
  conversationsCount: number;
  lastActivityAt?: string;
}

export type WorkflowLogStage = "product" | "design" | "build" | "update";
export type WorkflowLogSection = "blueprint" | "preview" | "decisions" | "logs" | "build-log" | "request" | "update-log";
export type WorkflowLogRecordKind = "artifact" | "decisions" | "log" | "request" | "context";

export interface WorkflowLogEvent {
  id: string;
  recordId: string;
  seq: number;
  type: string;
  message: string;
  payload?: unknown;
  createdAt: string;
}

export interface WorkflowLogRecordSummary {
  id: string;
  projectRoot: string;
  stage: WorkflowLogStage;
  section: WorkflowLogSection;
  kind: WorkflowLogRecordKind;
  title: string;
  summary: string;
  contentType?: string;
  createdAt: string;
  eventCount: number;
}

export interface WorkflowLogRecordDetail extends WorkflowLogRecordSummary {
  content?: string;
  payload?: unknown;
  events: WorkflowLogEvent[];
}

export interface WorkflowLogSectionGroup {
  section: WorkflowLogSection;
  enabled: boolean;
  records: WorkflowLogRecordSummary[];
}

export interface WorkflowLogStageGroup {
  stage: WorkflowLogStage;
  enabled: boolean;
  sections: WorkflowLogSectionGroup[];
}

export interface WorkflowLogBoard {
  projectRoot: string;
  stages: WorkflowLogStageGroup[];
}
