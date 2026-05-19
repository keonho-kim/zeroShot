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
  bootstrapRoots: string[];
  allowedRoots: string[];
  resourceRoots: {
    skills: string;
    designTemplates: string;
    designSystems: string;
  };
  server: {
    host: string;
    port: number;
  };
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
    modelReasoningEffort?: string;
    approvalsReviewer?: string;
    goalsEnabled?: boolean;
  };
}

export interface ProjectCodexSettingsStatus {
  projectRoot: string;
  configPath: string;
  exists: boolean;
  trusted: boolean;
  model?: string;
  modelReasoningEffort?: string;
  approvalPolicy?: string;
  sandboxMode?: string;
  goalsEnabled: boolean;
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
  isAllowedRoot?: boolean;
  hasWorkHistory?: boolean;
  runsCount?: number;
}

export interface LanguageStat {
  language: string;
  bytes: number;
  percentage: number;
}

export interface ProjectState {
  projectRoot: string;
  hasProduct: boolean;
  hasProductHtml: boolean;
  hasDesign: boolean;
  hasUpdate: boolean;
  hasSourceCode: boolean;
  isDirectoryEmpty: boolean;
  languageStats: LanguageStat[];
  buildEnabled: boolean;
  workHistoryExists: boolean;
  runsCount: number;
  latestRunName?: string;
  sourceBytes: number;
  sourceFileCount: number;
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

export type WorkLogLabel = "ARCHITECT" | "MAKEOVER" | "BUILD" | "UPDATE";

export interface WorkLogProjectSummary {
  projectRoot: string;
  name: string;
  runsCount: number;
  conversationsCount: number;
  lastActivityAt?: string;
}

export interface WorkLogEntrySummary {
  id: string;
  label: WorkLogLabel;
  title: string;
  summary: string;
  createdAt?: string;
}

export interface WorkLogEntryDetail {
  summary: WorkLogEntrySummary;
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
  responseLanguage?: string;
  additionalDirectories?: string[];
}

export interface ProjectSettings {
  projectRoot: string;
  activeSkillId?: string;
  activeDesignTemplateId?: string;
  activeDesignSystemId?: string;
}

export type DesignRuntimeMode = "codex" | "figma" | "powerpoint";

export interface DesignRuntimeSection {
  id: string;
  title: string;
  body: string;
}

export interface DesignRuntimeAction {
  label: string;
  detail: string;
  owner: "codex" | "designer" | "reviewer";
}

export interface DesignRuntimeArtifact {
  path: string;
  type: string;
  title: string;
  description: string;
}

export interface DesignRuntimeFile {
  path: string;
  type: string;
  title: string;
  content: string;
}

export interface DesignRuntimeResponse {
  id: string;
  projectRoot: string;
  mode: DesignRuntimeMode;
  chatMessage: string;
  title: string;
  summary: string;
  generatedAt: string;
  designMarkdown: string;
  sections: DesignRuntimeSection[];
  actions: DesignRuntimeAction[];
  artifacts: DesignRuntimeArtifact[];
  files: DesignRuntimeFile[];
}

export interface DesignProgressEvent {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
}

export interface DesignRecommendationOption {
  id: string;
  resourceId: string;
  label: string;
  detail: string;
  reason: string;
}

export interface DesignRecommendationResponse {
  title: string;
  summary: string;
  designSystems: DesignRecommendationOption[];
  designTemplates: DesignRecommendationOption[];
}

export interface ResourceFileSummary {
  path: string;
  kind: "reference" | "asset" | "example" | "other";
  size: number;
}

export interface ResourceManifest {
  id: string;
  name: string;
  description: string;
  category?: string;
  tags: string[];
  root: string;
  manifestPath: string;
  body: string;
  files: ResourceFileSummary[];
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
