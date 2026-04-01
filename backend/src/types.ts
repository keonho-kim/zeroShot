export type RunMode = "build" | "update";

export interface AppDefaults {
  approval: string;
  sandbox: string;
  maxIters: number;
  stallLimit: number;
  planReasoning: string;
  execReasoning: string;
  validateReasoning: string;
  closeoutReasoning: string;
}

export interface AppConfig {
  allowedRoots: string[];
  defaults: AppDefaults;
}

export interface CodexModelProvider {
  id: string;
  name: string;
  baseUrl: string;
  envKey?: string;
}

export interface CodexProfile {
  id: string;
  modelProvider: string;
  model: string;
}

export interface CodexSettings {
  modelProviders: CodexModelProvider[];
  profiles: CodexProfile[];
  defaults: {
    profile?: string;
    model?: string;
    modelProvider?: string;
    approvalPolicy?: string;
    sandboxMode?: string;
  };
}

export interface AuthStatus {
  exists: boolean;
  valid: boolean;
  path: string;
  message: string;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
}

export interface ProjectState {
  projectRoot: string;
  hasProduct: boolean;
  hasUpdate: boolean;
  workHistoryExists: boolean;
  runsCount: number;
  latestRunName?: string;
  updateEnabled: boolean;
}

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
}

export interface ShellCommandSpec {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
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

export interface FileReadResult {
  kind: "file" | "directory";
  path: string;
  content?: string;
  entries?: DirectoryEntry[];
}
