import { AgentLoadingStage } from "@/components/AgentLoadingStage";
import { CodexLoadingLog } from "@/components/CodexLoadingLog";
import { hasCodexThreadStarted } from "@/entities/codex/codex-loading-log";
import { useI18n } from "@/lib/i18n";

interface CodexLoadingProgressItem {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
}

export function CodexLoadingPanel(props: {
  label: string;
  progressItems: CodexLoadingProgressItem[];
  messages: string[];
  emptyMessage: string;
  noteTitle?: string;
  noteDetail?: string;
}) {
  const { t } = useI18n();
  const threadStarted = hasCodexThreadStarted(props.messages);

  return (
    <div className="codex-loading-panel">
      <AgentLoadingStage
        label={threadStarted ? t("common.codexThreadRunning") : props.label}
        phase={threadStarted ? "running" : "starting"}
      />
      {props.noteTitle || props.noteDetail ? (
        <div className="codex-loading-panel-note">
          {props.noteTitle ? <p>{props.noteTitle}</p> : null}
          {props.noteDetail ? <span>{props.noteDetail}</span> : null}
        </div>
      ) : null}
      <CodexLoadingLog
        progressItems={props.progressItems}
        messages={props.messages}
        emptyMessage={props.emptyMessage}
      />
    </div>
  );
}
