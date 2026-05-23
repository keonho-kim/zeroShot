import { Navigate } from "react-router-dom";
import { PageHeader } from "@/shared/ui/PageHeader";
import { CodexLoadingPanel } from "@/widgets/codex-loading/CodexLoadingPanel";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ArtifactWorkbench } from "@/pages/design/artifact-workbench/ArtifactWorkbench";
import { DesignResult } from "@/pages/design/DesignResult";
import { DesignRuntimeSetup } from "@/pages/design/DesignRuntimeSetup";
import { useDesignPageController } from "@/pages/design/page-controller";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/shared/lib/cn";

export function DesignPage() {
  const { t } = useI18n();
  const controller = useDesignPageController();

  if (!controller.projectRoot) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className={cn("builder-shell design-page", controller.makeoverStep === "workbench" && "design-page-workbench-wide")}>
      <PageHeader title="DESIGN" projectRoot={controller.projectRoot} />

      <div className="design-workbench">
        {controller.makeoverStep !== "loading" ? (
          <div className="makeover-step-tabs" role="tablist" aria-label="Design pages">
            <Button variant={controller.makeoverStep === "brief" ? "default" : "outline"} onClick={() => controller.setMakeoverStep("brief")}>1. REQUEST</Button>
            <Button variant={controller.makeoverStep === "workbench" ? "default" : "outline"} disabled={!controller.hasDesignHtml} onClick={() => controller.setMakeoverStep("workbench")}>2. DESIGN WORKBENCH</Button>
            <Button variant={controller.makeoverStep === "preview" ? "default" : "outline"} disabled={!controller.designResult} onClick={() => controller.setMakeoverStep("preview")}>3. BRIEF PREVIEW</Button>
          </div>
        ) : null}

        {controller.makeoverStep === "brief" ? (
          <DesignRuntimeSetup
            projectRoot={controller.projectRoot}
            resources={controller.resources}
            recommendations={controller.recommendations}
            recommendationTimelineItems={controller.recommendationTimelineItems}
            recommendationMessages={controller.recommendationMessages}
            recommendationError={controller.recommendationError}
            isLoadingRecommendations={controller.recommendationMutation.isPending}
            designResult={controller.designResult}
            hasProductHtml={controller.hasProductHtml}
            goal={controller.goal}
            setGoal={controller.setGoal}
            activeDesignTemplateId={controller.activeDesignTemplateId}
            activeDesignSystemId={controller.activeDesignSystemId}
            activeDesignTemplateSelectionMode={controller.activeDesignTemplateSelectionMode}
            activeDesignSystemSelectionMode={controller.activeDesignSystemSelectionMode}
            runtimeError={controller.runtimeError}
            timelineItems={controller.timelineItems}
            isRunning={controller.designMutation.isPending}
            isComplete={controller.makeoverComplete}
            onChangeDesignTemplate={controller.changeDesignTemplate}
            onChangeDesignSystem={controller.changeDesignSystem}
            onRetryRecommendations={() => {
              controller.setRecommendations(null);
              controller.setRecommendationError("");
              controller.recommendationMutation.mutate();
            }}
            onRun={() => controller.runMakeover(controller.goal)}
          />
        ) : null}

        {controller.makeoverStep === "loading" ? (
          <Card className="makeover-loading-card">
            <CodexLoadingPanel
              label={t("makeover.runtimeLoadingLabel")}
              progressItems={controller.timelineItems}
              messages={controller.runtimeMessages}
              emptyMessage={t("makeover.loadingMessage")}
            />
          </Card>
        ) : null}

        {controller.makeoverStep === "workbench" ? (
          <ArtifactWorkbench
            hasProductHtml={controller.hasDesignHtml}
            artifactEtag={controller.designArtifactQuery.data?.etag}
            artifactUpdatedAt={controller.designArtifactQuery.data?.updatedAt}
            artifactFrameRef={controller.artifactFrameRef}
            artifactSrcDoc={controller.artifactSrcDoc}
            artifactMode={controller.artifactMode}
            artifactViewport={controller.artifactViewport}
            setArtifactViewport={controller.setArtifactViewport}
            artifactZoom={controller.artifactZoom}
            setArtifactZoom={controller.setArtifactZoom}
            sourceDraft={controller.sourceDraft}
            setSourceDraft={controller.setSourceDraft}
            aiInstruction={controller.aiInstruction}
            setAiInstruction={controller.setAiInstruction}
            selectedTargets={controller.selectedTargets}
            commentCapture={controller.commentCapture}
            chatMessages={controller.artifactChatMessages}
            isRunning={controller.designMutation.isPending}
            artifactError={controller.artifactError}
            sourceHistory={controller.sourceHistory}
            redoHistory={controller.redoHistory}
            isSaving={controller.saveArtifactMutation.isPending}
            onReload={() => {
              void controller.designArtifactQuery.refetch();
            }}
            commentToolOpen={controller.commentToolOpen}
            onOpenCommentTool={() => controller.setCommentToolOpen(true)}
            onCloseCommentTool={() => controller.setCommentToolOpen(false)}
            onCaptureComment={controller.setCommentCapture}
            onRemoveCommentCapture={() => controller.setCommentCapture(null)}
            onClearTargetSelection={() => controller.setSelectedTargetIds([])}
            onApplySelectedTargetAiInstruction={controller.applySelectedTargetAiInstruction}
            onUndo={controller.undoArtifactChange}
            onRedo={controller.redoArtifactChange}
            onSave={() => controller.saveArtifactMutation.mutate()}
          />
        ) : null}

        {controller.makeoverStep === "preview" && controller.designResult ? <DesignResult design={controller.designResult} artifactHtml={controller.artifactSource} /> : null}
      </div>
    </div>
  );
}
