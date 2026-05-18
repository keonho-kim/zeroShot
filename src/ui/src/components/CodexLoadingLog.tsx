interface CodexLoadingProgressItem {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
}

export function CodexLoadingLog(props: {
  progressItems: CodexLoadingProgressItem[];
  messages: string[];
  emptyMessage: string;
}) {
  const messages = props.messages.map((message, index) => ({
    id: `message-${index}`,
    title: "Codex",
    detail: message
  }));
  const progressItems = props.progressItems.map((item) => ({
    id: `progress-${item.id}`,
    title: item.title,
    detail: item.detail
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
