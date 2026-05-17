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
  defaults: {
    approval: string;
    sandbox: string;
    maxIters: number;
    stallLimit: number;
    planReasoning: string;
    execReasoning: string;
    validateReasoning: string;
    closeoutReasoning: string;
  };
}

export interface CodexSettings {
  modelProviders: Array<{ id: string; name: string; baseUrl: string; envKey?: string }>;
  profiles: Array<{ id: string; modelProvider: string; model: string }>;
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

export interface JobSnapshot {
  id: string;
  mode: "build" | "update";
  projectRoot: string;
  status: "idle" | "running" | "completed" | "failed";
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
}

export interface PipelineOptions {
  responseLanguage?: string;
  additionalDirectories?: string[];
}

export interface ProjectSettings {
  projectRoot: string;
  activeSkillId?: string;
  activeDesignTemplateId?: string;
  activeDesignSystemId?: string;
}

export interface ProductArtifactFile {
  path: string;
  content: string;
  mime: string;
  etag: string;
  updatedAt: string;
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

export interface ArchitectDecisionOption {
  id: string;
  label: string;
  detail: string;
  productRequirement: string;
}

export interface ArchitectDecision {
  id: string;
  title: string;
  prompt: string;
  section: string;
  options: ArchitectDecisionOption[];
}

export interface ArchitectDecisionResponse {
  title: string;
  summary: string;
  decisions: ArchitectDecision[];
}

export interface BootstrapResult {
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
}

export interface ArchitectProgressEvent {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
}
