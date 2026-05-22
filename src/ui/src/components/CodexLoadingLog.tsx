import { useEffect, useRef } from "react";
import { buildCodexLoadingLogItems, type CodexLoadingProgressItem } from "@/entities/codex/codex-loading-log";

export function CodexLoadingLog(props: {
  progressItems: CodexLoadingProgressItem[];
  messages: string[];
  emptyMessage: string;
}) {
  const logRef = useRef<HTMLDivElement>(null);
  const items = buildCodexLoadingLogItems(props.progressItems, props.messages);
  const itemSignature = items.map((item) => `${item.id}:${item.detail}`).join("\n");

  useEffect(() => {
    const log = logRef.current;
    if (!log) {
      return;
    }
    const scrollToLatest = () => {
      log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
    };
    const frame = requestAnimationFrame(scrollToLatest);
    const timeout = window.setTimeout(scrollToLatest, 80);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [itemSignature]);

  return (
    <div className="codex-loading-log" aria-label="Codex progress" ref={logRef}>
      {items.length ? (
        items.map((item) => (
          <div key={item.id} className={`codex-loading-log-item ${item.kind}`}>
            {item.kind === "agent" || item.kind === "reasoning" ? (
              <>
                <span className="codex-loading-agent-icon" aria-hidden="true">{item.icon}</span>
                <pre>{item.detail}</pre>
              </>
            ) : item.kind === "tool" ? (
              <p>
                <strong>{item.icon} {item.title}</strong>
                {item.detail ? <span>{item.detail}</span> : null}
                {item.status ? <span className={`codex-loading-status ${item.status}`}>{item.status}</span> : null}
              </p>
            ) : (
              <>
                <strong>{item.title}</strong>
                <pre>{item.detail}</pre>
              </>
            )}
          </div>
        ))
      ) : (
        <div className="codex-loading-log-item raw">
          <pre>{props.emptyMessage}</pre>
        </div>
      )}
    </div>
  );
}
