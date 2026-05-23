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
