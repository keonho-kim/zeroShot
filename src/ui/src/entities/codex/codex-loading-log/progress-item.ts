import { searchDetail } from "@/entities/codex/codex-loading-log/search-target";
import { commandIcon } from "@/entities/codex/codex-loading-log/tool-labels";
import { formatUserText } from "@/entities/codex/codex-loading-log/text-format";
import type { CodexLoadingLogItem, CodexLoadingProgressItem, CodexLogTranslate } from "@/entities/codex/codex-loading-log/types";

function unscopedProgressId(id: string): string {
  return id.split(":").at(-1) ?? id;
}

function commandFromProgressDetail(detail: string): string {
  return detail.replace(/^[a-z_]+:\s+/i, "").trim();
}

export function codexProgressPresentation(item: Pick<CodexLoadingProgressItem, "id" | "detail" | "icon" | "kind">): {
  icon?: string;
  kind: NonNullable<CodexLoadingProgressItem["kind"]>;
} {
  if (item.kind) {
    return { kind: item.kind, icon: item.icon };
  }

  const id = unscopedProgressId(item.id);
  if (id.startsWith("search-")) {
    return { kind: "tool", icon: "🌐" };
  }
  if (id.startsWith("tool-")) {
    return { kind: "tool", icon: "🛠️" };
  }
  if (id.startsWith("command-")) {
    return { kind: "tool", icon: commandIcon(commandFromProgressDetail(item.detail)) };
  }
  if (id.startsWith("file-")) {
    return { kind: "tool", icon: "📝" };
  }
  if (id.startsWith("reasoning-")) {
    return { kind: "reasoning", icon: "💭" };
  }
  if (id.startsWith("agent-")) {
    return { kind: "agent", icon: "💬" };
  }
  return { kind: "progress", icon: item.icon };
}

export function progressItem(item: CodexLoadingProgressItem, t: CodexLogTranslate): CodexLoadingLogItem {
  const presentation = codexProgressPresentation(item);
  const id = unscopedProgressId(item.id);
  const detail = id.startsWith("search-")
    ? searchDetail(item.detail.trim(), t)
    : formatUserText(item.detail.trim(), t);
  return {
    id: `progress-${item.id}`,
    kind: presentation.kind,
    title: item.title,
    detail,
    status: item.status,
    icon: presentation.icon
  };
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
