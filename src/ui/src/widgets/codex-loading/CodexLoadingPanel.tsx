import { AgentLoadingStage } from "@/widgets/codex-loading/AgentLoadingStage";
import { CodexLoadingLog } from "@/widgets/codex-loading/CodexLoadingLog";
import { codexLogSources, hasCodexThreadStarted, type CodexLoadingLogSource } from "@/entities/codex/codex-loading-log";
import { useI18n } from "@/lib/i18n";

interface CodexLoadingProgressItem {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
  kind?: "progress" | "tool" | "agent" | "reasoning";
  icon?: string;
}

export function CodexLoadingPanel(props: {
  label: string;
  progressItems: CodexLoadingProgressItem[];
  messages?: string[];
  sources?: CodexLoadingLogSource[];
  emptyMessage: string;
  noteTitle?: string;
  noteDetail?: string;
  density?: "default" | "compact";
}) {
  const { t } = useI18n();
  const sources = props.sources ?? codexLogSources(props.messages ?? []);
  const threadStarted = hasCodexThreadStarted(sources);

  return (
    <div className={`codex-loading-panel ${props.density ?? "default"}`}>
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
        sources={sources}
        emptyMessage={props.emptyMessage}
      />
    </div>
  );
}
