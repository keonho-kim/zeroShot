import type { TranslationKey } from "@/lib/i18n-core";
import { extractJsonField } from "@/entities/codex/codex-loading-log/raw-event";
import { hostnameFromUrl } from "@/entities/codex/codex-loading-log/search-target";
import type { CodexLogTranslate } from "@/entities/codex/codex-loading-log/types";

const stableMessageKeys: Record<string, TranslationKey> = {
  "Codex is planning the product and selecting the best path.": "log.omakase.architectPlanning",
  "Codex selected the recommended architecture choices.": "log.omakase.architectChoicesSelected",
  "Initial project structure is ready.": "log.omakase.initialProjectReady",
  "Product blueprint and project structure are ready.": "log.omakase.productReady",
  "Codex is exploring design systems and templates.": "log.omakase.designExploring",
  "Codex selected the first recommended design system and template.": "log.omakase.designSelected",
  "Design handoff is ready.": "log.omakase.designReady",
  "Codex is starting BUILD.": "log.omakase.buildStarting",
  "BUILD job started.": "log.omakase.buildJobStarted",
  "BUILD completed.": "log.omakase.buildCompleted"
};

export function compact(value: string, maxLength = 180): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

function localizeStableMessage(text: string, t: CodexLogTranslate): string {
  const key = stableMessageKeys[text.trim()];
  return key ? t(key) : text;
}

function splitTrailingPunctuation(url: string): { url: string; trailing: string } {
  const match = /^(?<url>.*?)(?<trailing>[.,;:!?]+)?$/.exec(url);
  return {
    url: match?.groups?.url ?? url,
    trailing: match?.groups?.trailing ?? ""
  };
}

function markdownLink(label: string, url: string): string {
  return `[${label.replace(/[[\]]/g, "").trim() || hostnameFromUrl(url)}](${url})`;
}

function linkifyUrls(text: string): string {
  const named = text.replace(
    /([,\n]\s*)([A-Z][A-Za-z0-9 ._-]{1,40})\s+(https?:\/\/[^\s<>)\]]+)/g,
    (_match, prefix: string, label: string, rawUrl: string) => {
      const { url, trailing } = splitTrailingPunctuation(rawUrl);
      return `${prefix}${markdownLink(label, url)}${trailing}`;
    }
  );

  return named.replace(/https?:\/\/[^\s<>)\]]+/g, (rawUrl, offset, whole) => {
    if (whole.slice(Math.max(0, offset - 2), offset) === "](") {
      return rawUrl;
    }
    const { url, trailing } = splitTrailingPunctuation(rawUrl);
    return `${markdownLink(hostnameFromUrl(url), url)}${trailing}`;
  });
}

function sanitizeAgentText(text: string): string {
  return text
    .replace(/\[([^\]]+)]\(\/Users\/[^)]+\)/g, "$1")
    .replace(/\/Users\/[^\s)]+\/([^/\s)]+)/g, "$1");
}

export function formatUserText(text: string, t: CodexLogTranslate): string {
  const localized = localizeStableMessage(text, t);
  return linkifyUrls(sanitizeAgentText(localized));
}

export function userFacingAgentText(text: string, t: CodexLogTranslate): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  const chatMessage = extractJsonField(trimmed, "chatMessage").trim();
  if (chatMessage) {
    return formatUserText(chatMessage, t);
  }

  return trimmed.startsWith("{") || trimmed.startsWith("[") ? "" : formatUserText(trimmed, t);
}
