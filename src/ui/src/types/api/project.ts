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

export interface ProjectSettings {
  projectRoot: string;
  activeSkillId?: string;
  activeDesignTemplateId?: string;
  activeDesignSystemId?: string;
}
