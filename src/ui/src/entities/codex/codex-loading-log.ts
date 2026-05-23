import type { TranslationKey } from "@/lib/i18n-core";
import { codexProgressPresentation, parseRawCodexEvent, progressForRawEvent, progressItem, readString, sourceItem } from "@/entities/codex/codex-loading-log-items";

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

export { codexProgressPresentation };

export function codexLogSources(rawMessages: string[]): CodexLoadingLogSource[] {
  return rawMessages.map((message) => ({ source: "codex", message }));
}

function upsert(items: CodexLoadingLogItem[], next: CodexLoadingLogItem): CodexLoadingLogItem[] {
  const existingIndex = items.findIndex((item) => item.id === next.id);
  if (existingIndex === -1) {
    return [...items, next];
  }
  return items.map((item, index) => index === existingIndex ? next : item);
}

function hasVisibleContent(item: CodexLoadingLogItem): boolean {
  return item.kind === "tool" || Boolean(item.detail.trim());
}

function hasSourceContent(source: CodexLoadingLogSource): boolean {
  if (source.source === "codex") {
    return Boolean(source.message.trim());
  }
  if (source.source === "job") {
    return Boolean(source.text.trim());
  }
  return Boolean(source.message.trim());
}

export function buildCodexLoadingLogItems(
  progressItems: CodexLoadingProgressItem[],
  sources: CodexLoadingLogSource[],
  t: CodexLogTranslate
): CodexLoadingLogItem[] {
  const latestSources = sources.filter(hasSourceContent);
  const parsedSources = latestSources.map((source, index) => ({
    source,
    event: source.source === "codex" ? parseRawCodexEvent(source.message) : null,
    index
  }));

  if (!parsedSources.some(({ event }) => readString(event?.type))) {
    const items = progressItems.map((item) => progressItem(item, t));

    return latestSources
      .map((source, index) => sourceItem(source, index, t))
      .filter((item): item is CodexLoadingLogItem => Boolean(item))
      .reduce(upsert, items)
      .filter(hasVisibleContent);
  }

  const progressById = new Map(progressItems.map((item) => [item.id, item]));
  let currentThreadScope = "";
  const nextItems = parsedSources.reduce<CodexLoadingLogItem[]>((items, { source, event, index }) => {
    const progress = progressForRawEvent(readString(event?.type), progressById);
    const withProgress = progress ? upsert(items, progressItem(progress, t)) : items;
    if (readString(event?.type) === "thread.started") {
      currentThreadScope = readString(event?.thread_id) || `thread-${index}`;
    }
    const item = sourceItem(source, index, t, currentThreadScope);
    return item ? upsert(withProgress, item) : withProgress;
  }, []);

  return nextItems.filter(hasVisibleContent);
}

export function hasCodexThreadStarted(sources: CodexLoadingLogSource[]): boolean {
  return sources.some((source) => source.source === "codex" && parseRawCodexEvent(source.message)?.type === "thread.started");
}
