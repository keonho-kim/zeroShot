export interface CodexLoadingProgressItem {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
}

export type CodexLoadingLogItem = {
  id: string;
  kind: "progress" | "tool" | "agent" | "raw";
  title: string;
  detail: string;
  icon?: string;
};

type RawCodexEvent = {
  type?: unknown;
  item?: Record<string, unknown>;
};

const toolItemTypes = new Set([
  "web_search",
  "mcp_tool_call",
  "command_execution",
  "file_change"
]);

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function compact(value: string, maxLength = 180): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

function itemKey(item: Record<string, unknown>, fallback: string): string {
  return readString(item.id) || readString(item.call_id) || readString(item.name) || fallback;
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

function toolLabelAndDetail(item: Record<string, unknown>): { icon: string; title: string; detail: string } | null {
  const type = readString(item.type);

  if (type === "web_search") {
    return {
      icon: "🔎",
      title: "Web search",
      detail: compact(readString(item.query) || readString(item.status) || "Preparing search")
    };
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
    return {
      icon: "⌨️",
      title: "Command",
      detail: compact(readString(item.command) || readString(item.cmd) || readString(item.status) || "Running")
    };
  }

  if (type === "file_change") {
    return {
      icon: "📝",
      title: "File change",
      detail: summarizeChanges(item) || compact(readString(item.status) || "Inspecting changes")
    };
  }

  return null;
}

function rawMessageItem(message: string, index: number): CodexLoadingLogItem {
  const parsed = parseRawCodexEvent(message);
  const item = parsed?.item;
  const itemType = item ? readString(item.type) : "";

  if (item && itemType === "agent_message") {
    const text = readString(item.text).trim();
    if (text) {
      return {
        id: `agent-${itemKey(item, String(index))}`,
        kind: "agent",
        title: "Agent message",
        detail: text,
        icon: "💬"
      };
    }
  }

  if (item && toolItemTypes.has(itemType)) {
    const tool = toolLabelAndDetail(item);
    if (tool) {
      return {
        id: `tool-${itemKey(item, `${itemType}-${index}`)}`,
        kind: "tool",
        title: tool.title,
        detail: tool.detail,
        icon: tool.icon
      };
    }
  }

  return {
    id: `raw-${index}`,
    kind: "raw",
    title: rawEventTitle(parsed, index),
    detail: message.trim()
  };
}

function upsert(items: CodexLoadingLogItem[], next: CodexLoadingLogItem): CodexLoadingLogItem[] {
  const existingIndex = items.findIndex((item) => item.id === next.id);
  if (existingIndex === -1) {
    return [...items, next];
  }
  return items.map((item, index) => index === existingIndex ? next : item);
}

export function buildCodexLoadingLogItems(
  progressItems: CodexLoadingProgressItem[],
  rawMessages: string[]
): CodexLoadingLogItem[] {
  const items = progressItems.map((item): CodexLoadingLogItem => ({
    id: `progress-${item.id}`,
    kind: "progress",
    title: item.title,
    detail: item.detail.trim()
  }));

  const nextItems = rawMessages
    .filter((message) => message.trim())
    .slice(-40)
    .map(rawMessageItem)
    .reduce(upsert, items);

  return nextItems.filter((item) => item.detail.trim()).slice(-50);
}
