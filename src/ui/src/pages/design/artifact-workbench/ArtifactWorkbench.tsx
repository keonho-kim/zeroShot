import { Card } from "@/components/ui/card";
import { ArtifactCodexPanel } from "@/pages/design/artifact-workbench/ArtifactCodexPanel";
import { ArtifactInspector } from "@/pages/design/artifact-workbench/ArtifactInspector";
import { ArtifactLayerPanel } from "@/pages/design/artifact-workbench/ArtifactLayerPanel";
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
              timelineItems={props.timelineItems}
              onApplySelectedTargetAiInstruction={props.onApplySelectedTargetAiInstruction}
            />

            <ArtifactStage
              artifactMode={props.artifactMode}
              artifactViewport={props.artifactViewport}
              artifactZoom={props.artifactZoom}
              artifactFrameRef={props.artifactFrameRef}
              artifactSrcDoc={props.artifactSrcDoc}
              sourceDraft={props.sourceDraft}
              setSourceDraft={props.setSourceDraft}
            />

            <div className="design-right-panel">
              <ArtifactLayerPanel
                trackedArtifacts={props.trackedArtifacts}
                layerSearch={props.layerSearch}
                setLayerSearch={props.setLayerSearch}
                filteredTargets={props.filteredTargets}
                selectedTarget={props.selectedTarget}
                setSelectedTarget={props.setSelectedTarget}
                setArtifactMode={props.setArtifactMode}
                onHighlightTarget={props.onHighlightTarget}
              />
              <ArtifactInspector
                selectedTarget={props.selectedTarget}
                artifactTab={props.artifactTab}
                setArtifactTab={props.setArtifactTab}
                attributeDraft={props.attributeDraft}
                setAttributeDraft={props.setAttributeDraft}
                outerHtmlDraft={props.outerHtmlDraft}
                setOuterHtmlDraft={props.setOuterHtmlDraft}
                sourceDraft={props.sourceDraft}
                setSourceDraft={props.setSourceDraft}
                onCommitPatch={props.onCommitPatch}
                onApplyAttributeDraft={props.onApplyAttributeDraft}
              />
            </div>
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
