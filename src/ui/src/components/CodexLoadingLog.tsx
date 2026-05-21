import { useEffect, useRef } from "react";

interface CodexLoadingProgressItem {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
}

function rawEventTitle(value: string, index: number): string {
  try {
    const parsed = JSON.parse(value) as { type?: unknown; item?: { type?: unknown } };
    return [parsed.type, parsed.item?.type].filter((item) => typeof item === "string").join(" · ") || `raw ${index + 1}`;
  } catch {
    return `raw ${index + 1}`;
  }
}

function messageItem(message: string, index: number) {
  return {
    id: `message-${index}`,
    title: rawEventTitle(message, index),
    detail: message.trim()
  };
}

export function CodexLoadingLog(props: {
  progressItems: CodexLoadingProgressItem[];
  messages: string[];
  emptyMessage: string;
}) {
  const logRef = useRef<HTMLDivElement>(null);
  const messages = props.messages
    .filter((message) => message.trim())
    .slice(-40)
    .map(messageItem);
  const progressItems = props.progressItems.map((item) => ({
    id: `progress-${item.id}`,
    title: item.title,
    detail: item.detail.trim()
  }));
  const items = [...progressItems, ...messages].filter((item) => item.detail.trim()).slice(-50);
  const itemSignature = items.map((item) => `${item.id}:${item.detail}`).join("\n");

  useEffect(() => {
    const log = logRef.current;
    if (!log) {
      return;
    }
    log.scrollTop = log.scrollHeight;
  }, [itemSignature]);

  return (
    <div className="codex-loading-log" aria-label="Codex progress" ref={logRef}>
      {items.length ? (
        items.map((item) => (
          <div key={item.id}>
            <strong>{item.title}</strong>
            <pre>{item.detail}</pre>
          </div>
        ))
      ) : (
        <div>
          <pre>{props.emptyMessage}</pre>
        </div>
      )}
    </div>
  );
}
