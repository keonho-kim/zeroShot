import { ArrowRight, LoaderCircle, Save, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ArtifactHistoryEntry } from "@/entities/design/artifact-editor";

export function ArtifactWorkbenchFooter(props: {
  hasProductHtml: boolean;
  sourceHistory: ArtifactHistoryEntry[];
  redoHistory: ArtifactHistoryEntry[];
  isSaving: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
}) {
  return (
    <div className="design-artifact-footer">
      <span>{props.hasProductHtml ? "DESIGN/index.html loaded" : "DESIGN/index.html required"}</span>
      <div className="design-artifact-actions">
        <Button variant="outline" disabled={!props.sourceHistory.length} onClick={props.onUndo}>
          <Undo2 aria-hidden="true" />
          Undo
        </Button>
        <Button variant="outline" disabled={!props.redoHistory.length} onClick={props.onRedo}>
          <ArrowRight aria-hidden="true" />
          Redo
        </Button>
        <Button data-testid="artifact-save-button" disabled={props.isSaving || !props.hasProductHtml} onClick={props.onSave}>
          {props.isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
          Save
        </Button>
      </div>
    </div>
  );
}
