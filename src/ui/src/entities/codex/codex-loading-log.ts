export interface CodexLoadingProgressItem {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
}

export type CodexLoadingLogItem = {
  id: string;
  kind: "progress" | "tool" | "agent" | "reasoning" | "raw";
  title: string;
  detail: string;
  status?: "running" | "completed" | "failed";
  icon?: string;
};

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

const hiddenLifecycleEvents = new Set([
  "thread.started",
  "turn.started",
  "turn.completed"
]);

function readString(value: unknown): string {
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

function parseRawCodexEvent(value: string): RawCodexEvent | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? parsed as RawCodexEvent : null;
  } catch {
    return null;
  }
}

function rawEventTitle(event: RawCodexEvent | null, index: number): string {
  const itemType = event?.item ? readString(event.item.type) : "";
  return [readString(event?.type), itemType].filter(Boolean).join(" · ") || `raw ${index + 1}`;
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

function userFacingAgentText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  const chatMessage = extractJsonField(trimmed, "chatMessage").trim();
  if (chatMessage) {
    return sanitizeAgentText(chatMessage);
  }

  return trimmed.startsWith("{") || trimmed.startsWith("[") ? "" : sanitizeAgentText(trimmed);
}

function sanitizeAgentText(text: string): string {
  return text
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/\/Users\/[^\s)]+\/([^/\s)]+)/g, "$1");
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

function summarizeChanges(item: Record<string, unknown>): string {
  const changes = Array.isArray(item.changes) ? item.changes : [];
  return compact(changes
    .map((change) => {
      if (!change || typeof change !== "object") {
        return "";
      }
      const record = change as Record<string, unknown>;
      return [readString(record.kind), readString(record.path)].filter(Boolean).join(": ");
    })
    .filter(Boolean)
    .slice(0, 4)
    .join(", "));
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

function commandLabel(command: string): { icon: string; title: string } {
  const normalized = displayCommand(command);
  const token = firstCommandToken(normalized);

  if (["rg", "grep", "find", "fd", "ag"].includes(token)) {
    return { icon: "🔎", title: "Search files" };
  }
  if (["ls", "tree", "pwd", "du"].includes(token)) {
    return { icon: "📁", title: "Browse files" };
  }
  if (["cat", "sed", "awk", "head", "tail", "less", "nl"].includes(token)) {
    return { icon: "📄", title: "Read file" };
  }
  if (["curl", "wget"].includes(token)) {
    return { icon: "🌐", title: "Network request" };
  }
  if (token === "git") {
    return { icon: "🌿", title: "Git" };
  }
  if (["bun", "npm", "pnpm", "yarn", "node"].includes(token)) {
    return { icon: "📦", title: "JavaScript" };
  }
  if (["go", "cargo", "pytest", "vitest", "jest", "tsc"].includes(token)) {
    return { icon: "✅", title: "Check" };
  }
  return { icon: "⌨️", title: "Command" };
}

function webSearchLabel(item: Record<string, unknown>): { icon: string; title: string; detail: string } {
  const action = readRecord(item.action);
  const actionType = readString(action?.type);

  if (actionType === "open_page") {
    return {
      icon: "📄",
      title: "Read web page",
      detail: compact(readString(action?.url) || readString(item.query) || "Opening page")
    };
  }
  if (actionType === "find_in_page") {
    return {
      icon: "🔎",
      title: "Find in page",
      detail: compact(readString(action?.pattern) || readString(item.query) || "Finding text")
    };
  }
  return {
    icon: "🌐",
    title: "Web search",
    detail: compact(readString(item.query) || readString(action?.query) || "Searching the web")
  };
}

function toolLabelAndDetail(item: Record<string, unknown>): { icon: string; title: string; detail: string } | null {
  const type = readString(item.type);

  if (type === "web_search") {
    return webSearchLabel(item);
  }

  if (type === "mcp_tool_call") {
    const server = readString(item.server);
    const tool = readString(item.tool) || readString(item.name) || "Tool";
    const input = readString(item.input) || readString(item.arguments) || readString(item.status);
    return {
      icon: "🛠️",
      title: [server, tool].filter(Boolean).join("."),
      detail: compact(input || "Running")
    };
  }

  if (type === "command_execution") {
    const command = readString(item.command) || readString(item.cmd);
    const label = commandLabel(command);
    return {
      ...label,
      detail: compact(displayCommand(command) || readString(item.status) || "Running")
    };
  }

  if (type === "file_change") {
    return {
      icon: "📝",
      title: "File change",
      detail: summarizeChanges(item) || compact(readString(item.status) || "Inspecting changes")
    };
  }

  if (type === "image_view") {
    return {
      icon: "🖼️",
      title: "View image",
      detail: compact(readString(item.path) || "Opening image")
    };
  }

  return null;
}

function rawMessageItem(message: string, index: number, scope = ""): CodexLoadingLogItem | null {
  const parsed = parseRawCodexEvent(message);
  const eventType = readString(parsed?.type);
  if (hiddenLifecycleEvents.has(eventType)) {
    return null;
  }

  const item = parsed?.item;
  const itemType = item ? readString(item.type) : "";

  if (item && itemType === "agent_message") {
    const text = userFacingAgentText(readString(item.text));
    if (text) {
      return {
        id: `agent-${scopedItemKey(item, String(index), readString(parsed?.thread_id) || scope)}`,
        kind: "agent",
        title: "Agent message",
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
        title: "Reasoning",
        detail: text,
        status: itemStatus(parsed, item),
        icon: "💭"
      };
    }
  }

  if (item && toolItemTypes.has(itemType)) {
    const tool = toolLabelAndDetail(item);
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
    title: eventType === "turn.failed" || eventType === "error" ? "Codex error" : rawEventTitle(parsed, index),
    detail: readString(parsed?.error?.message) || readString(parsed?.message) || message.trim(),
    status: eventType === "turn.failed" || eventType === "error" ? "failed" : undefined
  };
}

function progressItem(item: CodexLoadingProgressItem): CodexLoadingLogItem {
  return {
    id: `progress-${item.id}`,
    kind: "progress",
    title: item.title,
    detail: item.detail.trim(),
    status: item.status
  };
}

function upsert(items: CodexLoadingLogItem[], next: CodexLoadingLogItem): CodexLoadingLogItem[] {
  const existingIndex = items.findIndex((item) => item.id === next.id);
  if (existingIndex === -1) {
    return [...items, next];
  }
  return items.map((item, index) => index === existingIndex ? next : item);
}

function progressForRawEvent(
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

export function buildCodexLoadingLogItems(
  progressItems: CodexLoadingProgressItem[],
  rawMessages: string[]
): CodexLoadingLogItem[] {
  const latestMessages = rawMessages
    .filter((message) => message.trim());
  const parsedMessages = latestMessages.map((message, index) => ({
    message,
    event: parseRawCodexEvent(message),
    index
  }));

  if (!parsedMessages.some(({ event }) => readString(event?.type))) {
    const items = progressItems.map(progressItem);

    return latestMessages
      .map((message, index) => rawMessageItem(message, index))
      .filter((item): item is CodexLoadingLogItem => Boolean(item))
      .reduce(upsert, items)
      .filter((item) => item.detail.trim());
  }

  const progressById = new Map(progressItems.map((item) => [item.id, item]));
  let currentThreadScope = "";
  const nextItems = parsedMessages.reduce<CodexLoadingLogItem[]>((items, { message, event, index }) => {
    const progress = progressForRawEvent(readString(event?.type), progressById);
    const withProgress = progress ? upsert(items, progressItem(progress)) : items;
    if (readString(event?.type) === "thread.started") {
      currentThreadScope = readString(event?.thread_id) || `thread-${index}`;
    }
    const rawItem = rawMessageItem(message, index, currentThreadScope);
    return rawItem ? upsert(withProgress, rawItem) : withProgress;
  }, []);

  return nextItems.filter((item) => item.detail.trim());
}

export function hasCodexThreadStarted(rawMessages: string[]): boolean {
  return rawMessages.some((message) => parseRawCodexEvent(message)?.type === "thread.started");
}
