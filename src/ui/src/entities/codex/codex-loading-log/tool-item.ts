import { readRecord, readString } from "@/entities/codex/codex-loading-log/raw-event";
import { hostnameFromUrl, searchDetail } from "@/entities/codex/codex-loading-log/search-target";
import { commandLabel } from "@/entities/codex/codex-loading-log/tool-labels";
import type { CodexLogTranslate } from "@/entities/codex/codex-loading-log/types";

export const toolItemTypes = new Set([
  "web_search",
  "mcp_tool_call",
  "command_execution",
  "file_change",
  "image_view"
]);

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
    detail: searchDetail(readString(item.query), t)
  };
}

export function toolLabelAndDetail(item: Record<string, unknown>, t: CodexLogTranslate): { icon: string; title: string; detail: string } | null {
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
