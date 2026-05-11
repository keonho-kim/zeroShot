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
  options: Required<Omit<PipelineOptions, "model">> & { model?: string };
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
}
