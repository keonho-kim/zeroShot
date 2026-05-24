import { parseRawCodexEvent, readString, type RawCodexEvent } from "@/entities/codex/codex-loading-log/raw-event";
import { searchDetail } from "@/entities/codex/codex-loading-log/search-target";
import { formatUserText, userFacingAgentText, compact } from "@/entities/codex/codex-loading-log/text-format";
import { commandLabel, displayCommand } from "@/entities/codex/codex-loading-log/tool-labels";
import { toolItemTypes, toolLabelAndDetail } from "@/entities/codex/codex-loading-log/tool-item";
import type { CodexLoadingLogItem, CodexLoadingLogSource, CodexLogTranslate } from "@/entities/codex/codex-loading-log/types";

const hiddenLifecycleEvents = new Set(["thread.started", "turn.started", "turn.completed"]);

function itemKey(item: Record<string, unknown>, fallback: string): string {
  return readString(item.id) || readString(item.call_id) || readString(item.name) || fallback;
}

function scopedItemKey(item: Record<string, unknown>, fallback: string, scope: string): string {
  const key = itemKey(item, fallback);
  return scope ? `${scope}-${key}` : key;
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
      detail: searchDetail(webSearch.groups.query, t),
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
