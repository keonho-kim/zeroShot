import type { ThreadEvent } from "@openai/codex-sdk";
import { textByLocale } from "@backend/i18n/locale.js";

export interface CodexProgressEvent {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
}

interface CodexProgressCopy {
  reasoningTitle: string;
  reasoningDetail: string;
  agentTitle: string;
  agentDetail: string;
}

function progressText(locale: string, ko: string, en: string): string {
  return textByLocale(locale, { ko, en, zh: en, ja: en, es: en, de: en });
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function truncate(value: string, maxLength = 140): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function itemKey(item: Record<string, unknown>, fallback: string): string {
  return readString(item.id) || readString(item.call_id) || readString(item.name) || fallback;
}

function itemStatus(event: ThreadEvent, item: Record<string, unknown>): CodexProgressEvent["status"] {
  const raw = readString(item.status).toLowerCase();
  if (raw === "failed" || raw === "error") {
    return "failed";
  }
  if (event.type === "item.completed" || raw === "completed" || raw === "succeeded") {
    return "completed";
  }
  return "running";
}

function commandDetail(locale: string, item: Record<string, unknown>): string {
  const command = truncate(readString(item.command) || readString(item.cmd) || progressText(locale, "명령 내용을 기다리는 중입니다.", "Waiting for command details."));
  const status = readString(item.status);
  return status ? `${status}: ${command}` : command;
}

function fileChangeDetail(locale: string, item: Record<string, unknown>): string {
  const changes = Array.isArray(item.changes) ? item.changes : [];
  const summary = changes
    .map((change) => {
      if (!change || typeof change !== "object") {
        return "";
      }
      const record = change as Record<string, unknown>;
      return [readString(record.kind), readString(record.path)].filter(Boolean).join(":");
    })
    .filter(Boolean)
    .slice(0, 4)
    .join(", ");
  return truncate(summary || progressText(locale, "파일 변경 내역을 확인하고 있습니다.", "Inspecting file changes."));
}

export function describeCodexProgress(event: ThreadEvent, locale: string, copy: CodexProgressCopy): CodexProgressEvent | null {
  if (!("item" in event)) {
    return null;
  }

  const item = event.item as Record<string, unknown>;
  const type = readString(item.type);
  const status = itemStatus(event, item);

  if (type === "reasoning") {
    return {
      id: `reasoning-${itemKey(item, "current")}`,
      title: copy.reasoningTitle,
      detail: copy.reasoningDetail,
      status
    };
  }

  if (type === "agent_message") {
    return {
      id: `agent-${itemKey(item, "message")}`,
      title: copy.agentTitle,
      detail: copy.agentDetail,
      status
    };
  }

  if (type === "web_search") {
    const query = truncate(readString(item.query) || progressText(locale, "검색어를 준비하고 있습니다.", "Preparing the search query."));
    return {
      id: `search-${itemKey(item, query)}`,
      title: progressText(locale, "검색 중", "Searching"),
      detail: query,
      status
    };
  }

  if (type === "mcp_tool_call") {
    const server = readString(item.server) || progressText(locale, "도구 서버", "tool server");
    const tool = readString(item.tool) || readString(item.name) || progressText(locale, "도구", "tool");
    const rawStatus = readString(item.status);
    return {
      id: `tool-${itemKey(item, `${server}-${tool}`)}`,
      title: progressText(locale, "도구 호출", "Tool call"),
      detail: truncate([`${server}.${tool}`, rawStatus].filter(Boolean).join(" · ")),
      status
    };
  }

  if (type === "command_execution") {
    return {
      id: `command-${itemKey(item, "current")}`,
      title: progressText(locale, "명령 실행", "Command execution"),
      detail: commandDetail(locale, item),
      status
    };
  }

  if (type === "file_change") {
    return {
      id: `file-${itemKey(item, "changes")}`,
      title: progressText(locale, "파일 변경", "File changes"),
      detail: fileChangeDetail(locale, item),
      status
    };
  }

  return null;
}
