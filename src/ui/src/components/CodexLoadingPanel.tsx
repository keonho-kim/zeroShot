import { AgentLoadingStage } from "@/components/AgentLoadingStage";
import { CodexLoadingLog } from "@/components/CodexLoadingLog";

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
  return (
    <div className="codex-loading-panel">
      <AgentLoadingStage label={props.label} />
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
