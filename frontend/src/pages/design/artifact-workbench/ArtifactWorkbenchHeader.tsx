import { Code2, Frame, MousePointer2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ArtifactEditorMode } from "@/entities/design/artifact-editor";

export function ArtifactWorkbenchHeader(props: {
  hasProductHtml: boolean;
  artifactEtag?: string;
  artifactUpdatedAt?: string;
  artifactMode: ArtifactEditorMode;
  setArtifactMode: (mode: ArtifactEditorMode) => void;
  onReload: () => void;
}) {
  return (
    <div className="design-artifact-header">
      <div>
        <p className="agent-panel-kicker">ARTIFACT WORKBENCH</p>
        <h3>PRODUCT BLUEPRINT</h3>
        {props.hasProductHtml ? (
          <span className="design-file-meta">{props.artifactEtag ?? "unsaved"} · {props.artifactUpdatedAt ?? "pending"}</span>
        ) : null}
      </div>
      <div className="design-artifact-actions">
        <Button
          data-testid="artifact-preview-mode"
          variant={props.artifactMode === "preview" ? "default" : "outline"}
          disabled={!props.hasProductHtml}
          onClick={() => props.setArtifactMode("preview")}
        >
          <MousePointer2 aria-hidden="true" />
          Preview
        </Button>
        <Button
          data-testid="artifact-manual-mode"
          variant={props.artifactMode === "manual-edit" ? "default" : "outline"}
          disabled={!props.hasProductHtml}
          onClick={() => props.setArtifactMode("manual-edit")}
        >
          <Frame aria-hidden="true" />
          Edit
        </Button>
        <Button
          data-testid="artifact-source-mode"
          variant={props.artifactMode === "source" ? "default" : "outline"}
          disabled={!props.hasProductHtml}
          onClick={() => props.setArtifactMode("source")}
        >
          <Code2 aria-hidden="true" />
          Source
        </Button>
        <Button variant="outline" disabled={!props.hasProductHtml} onClick={props.onReload}>
          <RefreshCcw aria-hidden="true" />
          Reload
        </Button>
      </div>
    </div>
  );
}
