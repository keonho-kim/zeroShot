import { ArrowLeft, ArrowRight, Check, Layers3 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/shared/lib/cn";
import type { ArchitectProgressController } from "@/pages/architect-progress/page-controller";

export function ArchitectDecisionWorkspace({ controller }: { controller: ArchitectProgressController }) {
  const { t } = useI18n();

  return (
    <>
      <aside className="architect-left-notes" aria-label={t("architect.initialState")}>
        <div className="architect-brief-note">
          <span>{t("architect.idea")}</span>
          <p>{controller.submittedBrief || controller.userBrief}</p>
        </div>

        {(controller.bootstrapMutation.isPending || controller.bootstrapMutation.isSuccess || controller.bootstrapMutation.isError) ? (
          <div className={cn("architect-brief-note", "architect-bootstrap-note", controller.bootstrapMutation.isError && "failed")}>
            <span>{t("architect.bootstrap")}</span>
            <p>
              {controller.bootstrapMutation.isPending
                ? t("architect.preparingProject")
                : controller.bootstrapMutation.isSuccess
                  ? t("architect.projectReady")
                  : t("architect.projectFailed")}
            </p>
            {controller.bootstrapMutation.isSuccess && controller.bootstrapSummary ? (
              <div className="architect-bootstrap-summary">
                <strong>{controller.bootstrapSummary.summary}</strong>
                {controller.bootstrapSummary.profile ? <small>{controller.bootstrapSummary.profile}</small> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </aside>

      <div className="architect-stage-panel">
        {controller.currentDecision ? (
          <Card className="decision-card">
            <div className="decision-kicker">
              <Layers3 className="size-4" />
              {controller.currentDecision.section} · {controller.stepIndex + 1} / {controller.decisions.length}
            </div>
            <h2>{controller.currentDecision.title}</h2>
            <p>{controller.currentDecision.prompt}</p>
            {controller.bootstrapMutation.isError ? (
              <p className="architect-error">{controller.bootstrapMutation.error instanceof Error ? controller.bootstrapMutation.error.message : String(controller.bootstrapMutation.error)}</p>
            ) : null}
            <div className="choice-grid">
              {controller.currentDecision.options.map((option, index) => {
                const selected = controller.currentSelection === option.id;
                return (
                  <button
                    type="button"
                    className={cn("choice-card", selected && "selected")}
                    key={option.id}
                    disabled={controller.bootstrapMutation.isPending || controller.createBlueprintMutation.isPending}
                    onClick={() => controller.selectDecisionOption(option.id)}
                  >
                    <span className="choice-check">{selected ? <Check className="size-4" /> : null}</span>
                    <strong>{option.label}{index === 0 ? ` · ${t("common.recommended")}` : ""}</strong>
                    <span>{option.detail}</span>
                  </button>
                );
              })}
            </div>
            <div className="decision-actions">
              <Button variant="outline" disabled={controller.stepIndex === 0} onClick={() => controller.setStepIndex((value) => Math.max(0, value - 1))}>
                <ArrowLeft className="size-4" />
                {t("common.previous")}
              </Button>
              <Button disabled={!controller.currentSelection || controller.bootstrapMutation.isPending || controller.createBlueprintMutation.isPending || !controller.canCreateBlueprint && controller.stepIndex + 1 >= controller.decisions.length} onClick={controller.goNext}>
                {controller.stepIndex + 1 >= controller.decisions.length
                  ? t("architect.createProduct")
                  : t("common.next")}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </Card>
        ) : null}
      </div>

      <aside className="architect-choice-board" aria-label={t("architect.choiceHistory")}>
        <div className="choice-board-heading">
          <strong>{t("architect.choiceBoard")}</strong>
          <span>{controller.pinnedChoices.length} / {controller.decisions.length}</span>
        </div>
        {controller.pinnedChoices.length ? (
          <div className="pinned-choice-list">
            {controller.pinnedChoices.map(({ decision, option }, index) => (
              <article className="pinned-choice-note" key={decision.id} style={{ ["--pin-index" as string]: index }}>
                <span>{decision.title}</span>
                <strong>{option?.label}</strong>
                <p>{option?.detail}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="choice-board-empty">{t("architect.choicesPinned")}</p>
        )}
      </aside>
    </>
  );
}
