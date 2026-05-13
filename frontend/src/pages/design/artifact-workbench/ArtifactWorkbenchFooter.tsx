import { ArrowRight, Code2, LoaderCircle, Save, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ArtifactEditorMode, ArtifactHistoryEntry } from "@/entities/design/artifact-editor";
import type { CommitArtifactPatch } from "@/pages/design/artifact-workbench/types";

export function ArtifactWorkbenchFooter(props: {
  hasProductHtml: boolean;
  artifactMode: ArtifactEditorMode;
  sourceDraft: string;
  sourceHistory: ArtifactHistoryEntry[];
  redoHistory: ArtifactHistoryEntry[];
  isSaving: boolean;
  onCommitPatch: CommitArtifactPatch;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
}) {
  return (
    <div className="design-artifact-footer">
      <span>{props.hasProductHtml ? "PRODUCT BLUEPRINT loaded" : "PRODUCT BLUEPRINT required"}</span>
      <div className="design-artifact-actions">
        {props.artifactMode === "source" ? (
          <Button variant="outline" onClick={() => props.onCommitPatch({ kind: "set-full-source", source: props.sourceDraft })}>
            <Code2 aria-hidden="true" />
            Apply Source
          </Button>
        ) : null}
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
