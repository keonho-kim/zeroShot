import type { ArtifactHistoryEntry } from "@/entities/design/artifact-editor";

export function ArtifactHistoryPanel(props: {
  sourceHistory: ArtifactHistoryEntry[];
  redoHistory: ArtifactHistoryEntry[];
}) {
  return (
    <div className="design-history-panel" aria-label="Change history">
      <div>
        <strong>Change history</strong>
        <span>{props.sourceHistory.length} changes · {props.redoHistory.length} redo</span>
      </div>
      <div className="design-history-list">
        {props.sourceHistory.slice(-5).reverse().map((entry) => (
          <span key={entry.id}>{entry.label}</span>
        ))}
      </div>
    </div>
  );
}
