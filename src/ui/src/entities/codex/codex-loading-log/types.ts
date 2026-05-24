import type { TranslationKey } from "@/lib/i18n-core";

export interface CodexLoadingProgressItem {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
  kind?: "progress" | "tool" | "agent" | "reasoning";
  icon?: string;
}

export type CodexLoadingLogItem = {
  id: string;
  kind: "progress" | "tool" | "agent" | "reasoning" | "raw";
  title: string;
  detail: string;
  status?: "running" | "completed" | "failed";
  icon?: string;
};

export type CodexLoadingLogSource =
  | { source: "codex"; message: string }
  | { source: "job"; id?: string; lineType: string; text: string }
  | { source: "omakase"; id?: string; stage: string; message: string };

export type CodexLogTranslate = (key: TranslationKey, params?: Record<string, string | number>) => string;
