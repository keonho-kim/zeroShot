import { RefreshCcw } from "lucide-react";
import { Button } from "@/shared/ui/button";

export function ArtifactWorkbenchHeader(props: {
  hasProductHtml: boolean;
  artifactEtag?: string;
  artifactUpdatedAt?: string;
  onReload: () => void;
}) {
  return (
    <div className="design-artifact-header">
      <div>
        <p className="agent-panel-kicker">DESIGN WORKBENCH</p>
        <h3>INTERACTIVE CANVAS</h3>
        {props.hasProductHtml ? (
          <span className="design-file-meta">{props.artifactEtag ?? "unsaved"} · {props.artifactUpdatedAt ?? "pending"}</span>
        ) : null}
      </div>
      <div className="design-artifact-actions">
        <Button variant="outline" disabled={!props.hasProductHtml} onClick={props.onReload}>
          <RefreshCcw aria-hidden="true" />
          Reload
        </Button>
      </div>
    </div>
  );
}
