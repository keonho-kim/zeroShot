export type RunMode = "build" | "update";
export type Gate = "PASS" | "FAIL";

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

export interface PipelineContext {
  mode: RunMode;
  projectRoot: string;
  toolRoot: string;
  productFile: string;
  updateFile: string;
  workRoot: string;
  activeRunFile: string;
  runDir: string;
  runName: string;
  runLogDir: string;
  runInputDir: string;
  outputsDir: string;
  previousRunDir: string;
  phaseSeq: number;
  pipelineNote: string;
  createdAt: string;
  compactState: PipelineState;
  options: Required<Omit<PipelineOptions, "model" | "additionalDirectories">> & {
    model?: string;
    additionalDirectories: string[];
  };
}

export interface WorkLogEntry {
  title: string;
  summary: string;
  filesChanged: string[];
  commandsRun: string[];
  validationResult: string;
  result: string;
}

export interface PipelineState {
  goalSummary: string;
  workQueue: string[];
  completedTasks: WorkLogEntry[];
  changedFiles: string[];
  validation: string[];
  openIssues: string[];
  nextSteps: string[];
  latestSummary: string;
}

export interface PhaseResult {
  gate: Gate;
  processExit: number;
  progressMade: boolean;
  queueEmpty: boolean;
  codeChanged: boolean;
  productSyncSafe: boolean;
  selectedTask: string;
  summary: string;
  resultJson: string;
  workLogEntries: WorkLogEntry[];
  resultSummary: string;
  changedFiles: string[];
  validation: string[];
  nextSteps: string[];
  openIssues: string[];
}
