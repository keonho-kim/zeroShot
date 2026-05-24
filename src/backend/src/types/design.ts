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
  chatMessage: string;
  title: string;
  summary: string;
  designSystems: DesignRecommendationOption[];
  designTemplates: DesignRecommendationOption[];
}
