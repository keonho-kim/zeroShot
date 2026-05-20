interface CodexLoadingProgressItem {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
}

function compact(value: string, maxLength = 160): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function messageItem(message: string, index: number) {
  const formatted = compact(message);
  const match = /^(?<title>검색 중|도구 호출|명령 실행|파일 변경|Codex 응답|Search|Tool call|Command|File change):\s*(?<detail>.+)$/.exec(formatted);
  if (match?.groups) {
    return {
      id: `message-${index}`,
      title: match.groups.title,
      detail: match.groups.detail
    };
  }
  return {
    id: `message-${index}`,
    title: "Codex",
    detail: formatted
  };
}

export function CodexLoadingLog(props: {
  progressItems: CodexLoadingProgressItem[];
  messages: string[];
  emptyMessage: string;
}) {
  const messages = props.messages
    .map((message) => compact(message))
    .filter((message, index, items) => message && items[index - 1] !== message)
    .slice(-20)
    .map(messageItem);
  const progressItems = props.progressItems.map((item) => ({
    id: `progress-${item.id}`,
    title: item.title,
    detail: compact(item.detail)
  }));
  const items = [...progressItems, ...messages].filter((item) => item.detail.trim());

  return (
    <div className="codex-loading-log" aria-label="Codex progress">
      {items.length ? (
        items.map((item) => (
          <div key={item.id}>
            <strong>{item.title}</strong>
            <span>{item.detail}</span>
          </div>
        ))
      ) : (
        <div>
          <span>{props.emptyMessage}</span>
        </div>
      )}
    </div>
  );
}
