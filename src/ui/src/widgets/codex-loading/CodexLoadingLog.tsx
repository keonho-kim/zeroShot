import { useEffect, useRef } from "react";
import { buildCodexLoadingLogItems, type CodexLoadingLogSource, type CodexLoadingProgressItem } from "@/entities/codex/codex-loading-log";
import { useI18n } from "@/lib/i18n";
import { MarkdownRenderer } from "@/shared/ui/MarkdownRenderer";

export function CodexLoadingLog(props: {
  progressItems: CodexLoadingProgressItem[];
  sources: CodexLoadingLogSource[];
  emptyMessage: string;
}) {
  const { t } = useI18n();
  const logRef = useRef<HTMLDivElement>(null);
  const items = buildCodexLoadingLogItems(props.progressItems, props.sources, t);
  const itemSignature = items.map((item) => `${item.id}:${item.title}:${item.detail}:${item.status ?? ""}`).join("\n");

  const statusLabel = (status: NonNullable<typeof items[number]["status"]>) => {
    if (status === "running") {
      return t("log.status.running");
    }
    if (status === "completed") {
      return t("log.status.completed");
    }
    return t("log.status.failed");
  };

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
                <MarkdownRenderer markdown={item.detail} className="codex-loading-markdown" />
              </>
            ) : item.kind === "tool" ? (
              <p>
                <strong>{item.icon} {item.title}</strong>
                {item.detail ? <span>{item.detail}</span> : null}
                {item.status ? <span className={`codex-loading-status ${item.status}`}>{statusLabel(item.status)}</span> : null}
              </p>
            ) : (
              <>
                <strong>{item.title}</strong>
                <MarkdownRenderer markdown={item.detail} className="codex-loading-markdown" />
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
