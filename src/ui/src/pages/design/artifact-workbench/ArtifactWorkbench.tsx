import { Card } from "@/components/ui/card";
import { ArtifactCodexPanel } from "@/pages/design/artifact-workbench/ArtifactCodexPanel";
import { ArtifactRequiredState } from "@/pages/design/artifact-workbench/ArtifactRequiredState";
import { ArtifactStage } from "@/pages/design/artifact-workbench/ArtifactStage";
import { ArtifactToolbar } from "@/pages/design/artifact-workbench/ArtifactToolbar";
import { ArtifactWorkbenchFooter } from "@/pages/design/artifact-workbench/ArtifactWorkbenchFooter";
import { ArtifactWorkbenchHeader } from "@/pages/design/artifact-workbench/ArtifactWorkbenchHeader";
import type { ArtifactWorkbenchProps } from "@/pages/design/artifact-workbench/types";

export function ArtifactWorkbench(props: ArtifactWorkbenchProps) {
  return (
    <Card className="design-source-panel design-artifact-workbench">
      <ArtifactWorkbenchHeader
        hasProductHtml={props.hasProductHtml}
        artifactEtag={props.artifactEtag}
        artifactUpdatedAt={props.artifactUpdatedAt}
        artifactMode={props.artifactMode}
        setArtifactMode={props.setArtifactMode}
        onReload={props.onReload}
      />

      {props.hasProductHtml ? (
        <>
          <ArtifactToolbar
            artifactViewport={props.artifactViewport}
            setArtifactViewport={props.setArtifactViewport}
            artifactZoom={props.artifactZoom}
            setArtifactZoom={props.setArtifactZoom}
          />

          <div className="design-artifact-layout enterprise">
            <ArtifactCodexPanel
              aiInstruction={props.aiInstruction}
              setAiInstruction={props.setAiInstruction}
              selectedTargets={props.selectedTargets}
              commentCapture={props.commentCapture}
              chatMessages={props.chatMessages}
              isRunning={props.isRunning}
              onApplySelectedTargetAiInstruction={props.onApplySelectedTargetAiInstruction}
              onClearTargetSelection={props.onClearTargetSelection}
              onRemoveCommentCapture={props.onRemoveCommentCapture}
            />

            <ArtifactStage
              artifactMode={props.artifactMode}
              artifactViewport={props.artifactViewport}
              artifactZoom={props.artifactZoom}
              artifactFrameRef={props.artifactFrameRef}
              artifactSrcDoc={props.artifactSrcDoc}
              selectedTargets={props.selectedTargets}
              commentToolOpen={props.commentToolOpen}
              sourceDraft={props.sourceDraft}
              setSourceDraft={props.setSourceDraft}
              onOpenCommentTool={props.onOpenCommentTool}
              onCloseCommentTool={props.onCloseCommentTool}
              onCaptureComment={props.onCaptureComment}
            />
          </div>
        </>
      ) : (
        <ArtifactRequiredState />
      )}

      {props.artifactError ? <p className="architect-error">{props.artifactError}</p> : null}

      <ArtifactWorkbenchFooter
        hasProductHtml={props.hasProductHtml}
        sourceHistory={props.sourceHistory}
        redoHistory={props.redoHistory}
        isSaving={props.isSaving}
        onUndo={props.onUndo}
        onRedo={props.onRedo}
        onSave={props.onSave}
      />
    </Card>
  );
}
