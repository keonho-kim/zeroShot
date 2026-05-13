import type { Dispatch, RefObject, SetStateAction } from "react";
import { Textarea } from "@/components/ui/textarea";
import type { ArtifactEditorMode } from "@/entities/design/artifact-editor";
import type { ArtifactViewport } from "@/pages/design/artifact-workbench/types";
import { cn } from "@/utils/cn";

export function ArtifactStage(props: {
  artifactMode: ArtifactEditorMode;
  artifactViewport: ArtifactViewport;
  artifactZoom: number;
  artifactFrameRef: RefObject<HTMLIFrameElement | null>;
  artifactSrcDoc: string;
  sourceDraft: string;
  setSourceDraft: Dispatch<SetStateAction<string>>;
}) {
  if (props.artifactMode === "source") {
    return (
      <div className="design-artifact-stage">
        <Textarea
          data-testid="artifact-source-input"
          value={props.sourceDraft}
          onChange={(event) => props.setSourceDraft(event.target.value)}
          aria-label="Artifact source"
        />
      </div>
    );
  }

  return (
    <div className="design-artifact-stage">
      <div className={cn("preview-viewport", `preview-viewport-${props.artifactViewport}`)} style={{ ["--artifact-zoom" as string]: props.artifactZoom }}>
        <iframe
          data-testid="artifact-preview-frame"
          ref={props.artifactFrameRef}
          title="Artifact preview"
          srcDoc={props.artifactSrcDoc}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
