import type { TranslationKey } from "@/lib/i18n-core";
import type { CodexLoadingLogItem, CodexLoadingLogSource, CodexLoadingProgressItem, CodexLogTranslate } from "@/entities/codex/codex-loading-log";

type RawCodexEvent = {
  type?: unknown;
  thread_id?: unknown;
  item?: Record<string, unknown>;
  message?: unknown;
  error?: { message?: unknown };
};

const toolItemTypes = new Set([
  "web_search",
  "mcp_tool_call",
  "command_execution",
  "file_change",
  "image_view"
]);

const hiddenLifecycleEvents = new Set(["thread.started", "turn.started", "turn.completed"]);

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

export function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function compact(value: string, maxLength = 180): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

function itemKey(item: Record<string, unknown>, fallback: string): string {
  return readString(item.id) || readString(item.call_id) || readString(item.name) || fallback;
}

function scopedItemKey(item: Record<string, unknown>, fallback: string, scope: string): string {
  const key = itemKey(item, fallback);
  return scope ? `${scope}-${key}` : key;
}

export function parseRawCodexEvent(value: string): RawCodexEvent | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? parsed as RawCodexEvent : null;
  } catch {
    return null;
  }
}

function decodeJsonStringContent(value: string): string {
  return value
    .replace(/\\\\/g, "\\")
    .replace(/\\"/g, "\"")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

function extractJsonField(raw: string, fieldName: string): string {
  const fieldIndex = raw.indexOf(`"${fieldName}"`);
  if (fieldIndex < 0) {
    return "";
  }
  const colonIndex = raw.indexOf(":", fieldIndex + fieldName.length + 2);
  if (colonIndex < 0) {
    return "";
  }
  const quoteIndex = raw.indexOf("\"", colonIndex + 1);
  if (quoteIndex < 0) {
    return "";
  }

  let escaped = false;
  let content = "";
  for (let index = quoteIndex + 1; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) {
      content += `\\${char}`;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      try {
        return JSON.parse(`"${content}"`) as string;
      } catch {
        return decodeJsonStringContent(content);
      }
    }
    content += char;
  }

  return decodeJsonStringContent(content);
}

function localizeStableMessage(text: string, t: CodexLogTranslate): string {
  const key = stableMessageKeys[text.trim()];
  return key ? t(key) : text;
}

function hostnameFromUrl(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return compact(value);
  }
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

function formatUserText(text: string, t: CodexLogTranslate): string {
  const localized = localizeStableMessage(text, t);
  return linkifyUrls(sanitizeAgentText(localized));
}

function userFacingAgentText(text: string, t: CodexLogTranslate): string {
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

function itemStatus(event: RawCodexEvent | null, item: Record<string, unknown>): CodexLoadingLogItem["status"] {
  const raw = readString(item.status).toLowerCase();
  if (raw === "failed" || raw === "error") {
    return "failed";
  }
  if (event?.type === "item.completed" || raw === "completed" || raw === "succeeded") {
    return "completed";
  }
  return "running";
}

function firstCommandToken(command: string): string {
  return command.trim().split(/\s+/)[0]?.replace(/^.*\//, "") ?? "";
}

function displayCommand(command: string): string {
  const trimmed = command.trim();
  const shellCommand = trimmed.match(/^(?:.*\/)?(?:sh|bash|zsh)\s+-lc\s+([\s\S]+)$/);
  const inner = shellCommand?.[1]?.trim();
  if (!inner) {
    return trimmed;
  }
  const quoted = inner.match(/^(['"])([\s\S]*)\1$/);
  return quoted?.[2] || inner;
}

function commandLabel(command: string, t: CodexLogTranslate): { icon: string; title: string } {
  const normalized = displayCommand(command);
  const token = firstCommandToken(normalized);

  if (["rg", "grep", "find", "fd", "ag"].includes(token)) {
    return { icon: "🔎", title: t("log.tool.searchFiles") };
  }
  if (["ls", "tree", "pwd", "du"].includes(token)) {
    return { icon: "📁", title: t("log.tool.browseFiles") };
  }
  if (["cat", "sed", "awk", "head", "tail", "less", "nl"].includes(token)) {
    return { icon: "📄", title: t("log.tool.readFile") };
  }
  if (["curl", "wget"].includes(token)) {
    return { icon: "🌐", title: t("log.tool.networkRequest") };
  }
  if (token === "git") {
    return { icon: "🌿", title: t("log.tool.git") };
  }
  if (["bun", "npm", "pnpm", "yarn", "node"].includes(token)) {
    return { icon: "📦", title: t("log.tool.javascript") };
  }
  if (["go", "cargo", "pytest", "vitest", "jest", "tsc"].includes(token)) {
    return { icon: "✅", title: t("log.tool.check") };
  }
  return { icon: "⌨️", title: t("log.tool.command") };
}

function webSearchLabel(item: Record<string, unknown>, t: CodexLogTranslate): { icon: string; title: string; detail: string } {
  const action = readRecord(item.action);
  const actionType = readString(action?.type);

  if (actionType === "open_page") {
    const url = readString(action?.url);
    return {
      icon: "📄",
      title: t("log.tool.readWebPage"),
      detail: url ? hostnameFromUrl(url) : ""
    };
  }
  if (actionType === "find_in_page") {
    return {
      icon: "🔎",
      title: t("log.tool.findInPage"),
      detail: ""
    };
  }
  return {
    icon: "🌐",
    title: t("log.tool.webSearch"),
    detail: ""
  };
}

function toolLabelAndDetail(item: Record<string, unknown>, t: CodexLogTranslate): { icon: string; title: string; detail: string } | null {
  const type = readString(item.type);

  if (type === "web_search") {
    return webSearchLabel(item, t);
  }

  if (type === "mcp_tool_call") {
    const server = readString(item.server);
    const tool = readString(item.tool) || readString(item.name) || "Tool";
    return {
      icon: "🛠️",
      title: [server, tool].filter(Boolean).join("."),
      detail: ""
    };
  }

  if (type === "command_execution") {
    const command = readString(item.command) || readString(item.cmd);
    const label = commandLabel(command, t);
    return {
      ...label,
      detail: ""
    };
  }

  if (type === "file_change") {
    return {
      icon: "📝",
      title: t("log.tool.fileChange"),
      detail: ""
    };
  }

  if (type === "image_view") {
    return {
      icon: "🖼️",
      title: t("log.tool.viewImage"),
      detail: ""
    };
  }

  return null;
}

function rawMessageItem(message: string, index: number, t: CodexLogTranslate, scope = ""): CodexLoadingLogItem | null {
  const parsed = parseRawCodexEvent(message);
  const eventType = readString(parsed?.type);
  if (hiddenLifecycleEvents.has(eventType)) {
    return null;
  }

  const item = parsed?.item;
  const itemType = item ? readString(item.type) : "";

  if (item && itemType === "agent_message") {
    const text = userFacingAgentText(readString(item.text), t);
    if (text) {
      return {
        id: `agent-${scopedItemKey(item, String(index), readString(parsed?.thread_id) || scope)}`,
        kind: "agent",
        title: t("log.agentMessage"),
        detail: text,
        status: itemStatus(parsed, item),
        icon: "💬"
      };
    }
  }

  if (item && itemType === "reasoning") {
    const text = readString(item.text).trim();
    if (text) {
      return {
        id: `reasoning-${scopedItemKey(item, String(index), readString(parsed?.thread_id) || scope)}`,
        kind: "reasoning",
        title: t("log.reasoning"),
        detail: formatUserText(text, t),
        status: itemStatus(parsed, item),
        icon: "💭"
      };
    }
  }

  if (item && toolItemTypes.has(itemType)) {
    const tool = toolLabelAndDetail(item, t);
    if (tool) {
      return {
        id: `tool-${scopedItemKey(item, `${itemType}-${index}`, readString(parsed?.thread_id) || scope)}`,
        kind: "tool",
        title: tool.title,
        detail: tool.detail,
        status: itemStatus(parsed, item),
        icon: tool.icon
      };
    }
  }

  return {
    id: `raw-${index}`,
    kind: "raw",
    title: eventType === "turn.failed" || eventType === "error" ? t("log.codexError") : t("log.workEvent"),
    detail: formatUserText(readString(parsed?.error?.message) || readString(parsed?.message) || message.trim(), t),
    status: eventType === "turn.failed" || eventType === "error" ? "failed" : undefined
  };
}

export function progressItem(item: CodexLoadingProgressItem, t: CodexLogTranslate): CodexLoadingLogItem {
  return {
    id: `progress-${item.id}`,
    kind: "progress",
    title: item.title,
    detail: formatUserText(item.detail.trim(), t),
    status: item.status
  };
}

function omakaseMessageItem(source: Extract<CodexLoadingLogSource, { source: "omakase" }>, index: number, t: CodexLogTranslate): CodexLoadingLogItem | null {
  const detail = formatUserText(source.message.trim(), t);
  if (!detail) {
    return null;
  }
  return {
    id: source.id ?? `omakase-${source.stage}-${index}`,
    kind: "agent",
    title: t("log.agentMessage"),
    detail,
    status: "running",
    icon: "💬"
  };
}

function codexJobLogDetail(value: string): string {
  return value.replace(/^\[codex]\s*/, "").trim();
}

function jobLogItem(source: Extract<CodexLoadingLogSource, { source: "job" }>, index: number, t: CodexLogTranslate): CodexLoadingLogItem | null {
  const detail = codexJobLogDetail(source.text.trim());
  const webSearch = /^(?:item updated|item completed): web_search\s+(?<query>.+)$/.exec(detail);
  if (webSearch?.groups?.query) {
    return {
      id: source.id ?? `job-web-${index}`,
      kind: "tool",
      title: t("log.tool.webSearch"),
      detail: compact(formatUserText(webSearch.groups.query, t)),
      icon: "🌐"
    };
  }

  const mcpTool = /^(?:item updated|item completed): mcp\s+(?<tool>\S+)(?:\s+(?<status>\S+))?/.exec(detail);
  if (mcpTool?.groups?.tool) {
    return {
      id: source.id ?? `job-mcp-${index}`,
      kind: "tool",
      title: t("log.tool.toolCall"),
      detail: compact([mcpTool.groups.tool, mcpTool.groups.status].filter(Boolean).join(" · ")),
      icon: "🛠️"
    };
  }

  const command = /^(?:item updated|item completed): command\s+(?<status>\S+)\s+(?<command>.+)$/.exec(detail);
  if (command?.groups?.command) {
    const label = commandLabel(command.groups.command, t);
    return {
      id: source.id ?? `job-command-${index}`,
      kind: "tool",
      title: label.title,
      detail: compact([command.groups.status, displayCommand(command.groups.command)].filter(Boolean).join(" · ")),
      icon: label.icon
    };
  }

  const fileChange = /^(?:item updated|item completed): file_change\s+(?<status>\S+)\s+(?<changes>.+)$/.exec(detail);
  if (fileChange?.groups?.changes) {
    return {
      id: source.id ?? `job-file-${index}`,
      kind: "tool",
      title: t("log.tool.fileChange"),
      detail: compact([fileChange.groups.status, fileChange.groups.changes].filter(Boolean).join(" · ")),
      icon: "📝"
    };
  }

  if (/^(?:item updated|item completed): agent_message$/.test(detail)) {
    return {
      id: source.id ?? `job-agent-${index}`,
      kind: "agent",
      title: t("log.agentMessage"),
      detail: t("log.codexResponseDetail"),
      icon: "💬"
    };
  }

  if (!detail) {
    return null;
  }

  return {
    id: source.id ?? `job-raw-${index}`,
    kind: "raw",
    title: t("log.workEvent"),
    detail: formatUserText(detail, t),
    status: source.lineType === "stderr" || source.lineType === "job_failed" ? "failed" : undefined
  };
}

export function sourceItem(source: CodexLoadingLogSource, index: number, t: CodexLogTranslate, scope = ""): CodexLoadingLogItem | null {
  if (source.source === "codex") {
    return rawMessageItem(source.message, index, t, scope);
  }
  if (source.source === "job") {
    return jobLogItem(source, index, t);
  }
  return omakaseMessageItem(source, index, t);
}

export function progressForRawEvent(
  eventType: string,
  progressById: Map<string, CodexLoadingProgressItem>
): CodexLoadingProgressItem | null {
  const candidatesByEvent: Record<string, string[]> = {
    "thread.started": ["session", "product-session"],
    "turn.started": ["analysis", "product-writing"],
    "turn.completed": ["validation", "product-validation", "complete"]
  };

  const candidates = candidatesByEvent[eventType] ?? [];
  for (const id of candidates) {
    const progress = progressById.get(id);
    if (progress) {
      return progress;
    }
  }

  return null;
}
