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
