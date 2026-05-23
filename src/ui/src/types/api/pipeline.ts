export type RunMode = "build" | "update";

export interface JobSnapshot {
  id: string;
  mode: RunMode;
  projectRoot: string;
  status: "idle" | "running" | "completed" | "failed";
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
}

export interface JobEvent {
  seq: number;
  type: "job_started" | "stdout" | "stderr" | "phase" | "job_finished" | "job_failed";
  data: Record<string, unknown>;
}

export interface PipelineOptions {
  responseLanguage?: string;
  additionalDirectories?: string[];
}

export interface BootstrapResult {
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
}
