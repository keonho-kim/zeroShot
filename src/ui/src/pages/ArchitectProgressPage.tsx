import { Eye } from "lucide-react";
import { Navigate } from "react-router-dom";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/shared/lib/cn";
import { ArchitectBlueprintWorkspace } from "@/pages/architect-progress/ArchitectBlueprintWorkspace";
import { ArchitectDecisionWorkspace } from "@/pages/architect-progress/ArchitectDecisionWorkspace";
import { ArchitectLoadingSection } from "@/pages/architect-progress/ArchitectLoadingSection";
import { ArchitectOverlays } from "@/pages/architect-progress/ArchitectOverlays";
import { useArchitectProgressController } from "@/pages/architect-progress/page-controller";

export function ArchitectProgressPage() {
  const { t } = useI18n();
  const controller = useArchitectProgressController();

  if (!controller.projectRoot) {
    return <Navigate to="/home" replace />;
  }

  if (!controller.userBrief.trim() || !controller.requestKey) {
    return <Navigate to="/architect" replace />;
  }

  return (
    <div className="builder-shell architect-page">
      {controller.blueprintReady ? (
        <Button className="view-blueprint-button" onClick={controller.viewBlueprint}>
          <Eye className="size-4" />
          {t("architect.viewProduct")}
        </Button>
      ) : null}
      <PageHeader title="ARCHITECT" projectRoot={controller.projectRoot} />
      <div className={cn("architect-chat", controller.decisionSet && "architect-chat-board")}>
        <section className={cn("architect-thread", controller.decisionSet && "architect-decision-workspace")} aria-label="Architect conversation">
          {!controller.decisionSet ? <ArchitectLoadingSection controller={controller} /> : null}
          {controller.decisionSet && controller.isComplete ? <ArchitectBlueprintWorkspace controller={controller} /> : null}
          {controller.decisionSet && !controller.isComplete ? <ArchitectDecisionWorkspace controller={controller} /> : null}
        </section>
      </div>
      <ArchitectOverlays
        blueprintHtml={controller.blueprintHtml}
        blueprintOpen={controller.blueprintOpen}
        continuePromptOpen={controller.continuePromptOpen}
        tutorialOpen={controller.tutorialOpen}
        createBlueprintPending={controller.createBlueprintMutation.isPending}
        onCloseBlueprint={controller.closeBlueprint}
        onContinueDesign={controller.continueToDesign}
        onDismissContinue={() => controller.setContinuePromptOpen(false)}
      />
    </div>
  );
}
