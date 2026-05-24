export type RunMode = "build" | "update";

export interface PipelineOptions {
  model?: string;
  approval?: string;
  sandbox?: string;
  maxIters?: number;
  stallLimit?: number;
  planReasoning?: string;
  execReasoning?: string;
  validateReasoning?: string;
  closeoutReasoning?: string;
  responseLanguage?: string;
  additionalDirectories?: string[];
}

export interface PipelineCommandSpec {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}

export interface BootstrapRequest {
  projectRoot: string;
  projectType: "backend" | "frontend" | "fullstack" | "library" | "script";
  language?: string;
  serverLanguage?: string;
  uiLanguage?: string;
  name?: string;
  module?: string;
  python?: string;
  profile?: "standard" | "llm";
  skipInit?: boolean;
  force?: boolean;
}

export interface BootstrapResult {
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
}

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
