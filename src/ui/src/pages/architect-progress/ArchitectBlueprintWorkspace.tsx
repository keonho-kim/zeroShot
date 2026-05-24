import { Card } from "@/shared/ui/card";
import { CodexLoadingPanel } from "@/widgets/codex-loading/CodexLoadingPanel";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/shared/lib/cn";
import type { ArchitectProgressController } from "@/pages/architect-progress/page-controller";

export function ArchitectBlueprintWorkspace({ controller }: { controller: ArchitectProgressController }) {
  const { t } = useI18n();

  return (
    <div className="architect-blueprint-workspace">
      <section className="architect-choice-board architect-blueprint-board" aria-label={t("architect.choiceBoard")}>
        <div className="choice-board-heading">
          <strong>{t("architect.choiceBoard")}</strong>
          <span>{controller.pinnedChoices.length} / {controller.decisions.length}</span>
        </div>
        <div className="pinned-choice-list">
          <article className="pinned-choice-note architect-blueprint-note idea" style={{ ["--pin-index" as string]: 0 }}>
            <span>{t("architect.idea")}</span>
            <strong>{controller.submittedBrief || controller.userBrief}</strong>
          </article>
          {(controller.bootstrapMutation.isPending || controller.bootstrapMutation.isSuccess || controller.bootstrapMutation.isError) ? (
            <article className={cn("pinned-choice-note", "architect-blueprint-note", "bootstrap", controller.bootstrapMutation.isError && "failed")} style={{ ["--pin-index" as string]: 1 }}>
              <span>{t("architect.bootstrap")}</span>
              <strong>
                {controller.bootstrapMutation.isPending
                  ? t("architect.preparingStructure")
                  : controller.bootstrapMutation.isSuccess
                    ? t("architect.contextReady")
                    : t("architect.structureFailed")}
              </strong>
              {controller.bootstrapMutation.isSuccess && controller.bootstrapSummary ? (
                <p>{[controller.bootstrapSummary.summary, controller.bootstrapSummary.profile].filter(Boolean).join(" · ")}</p>
              ) : null}
            </article>
          ) : null}
          {controller.pinnedChoices.map(({ decision, option }, index) => (
            <article className="pinned-choice-note architect-blueprint-note" key={decision.id} style={{ ["--pin-index" as string]: index + 2 }}>
              <span>{decision.title}</span>
              <strong>{option?.label}</strong>
              <p>{option?.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="architect-stage-panel">
        <Card className="decision-card complete architect-blueprint-status">
          {controller.createBlueprintMutation.isPending ? (
            <CodexLoadingPanel
              label={t("architect.writingBlueprint")}
              progressItems={controller.blueprintTimelineItems}
              messages={controller.blueprintStreamMessages}
              emptyMessage={t("architect.blueprintLoadingMessage")}
            />
          ) : (
            <>
              <div className="decision-kicker">{t("architect.blueprintReady")}</div>
              <h2>{t("architect.blueprintReady")}</h2>
              <p>{t("architect.blueprintReadyDetail")}</p>
            </>
          )}
          {controller.blueprintHtml ? (
            <div className="product-html-preview architect-design-preview">
              <iframe title="Product blueprint preview" srcDoc={controller.blueprintHtml} />
            </div>
          ) : null}
          {controller.bootstrapMutation.isError ? (
            <p className="architect-error">{controller.bootstrapMutation.error instanceof Error ? controller.bootstrapMutation.error.message : String(controller.bootstrapMutation.error)}</p>
          ) : null}
          {controller.createBlueprintMutation.isError ? <p className="architect-error">{t("architect.blueprintError")}</p> : null}
        </Card>
      </div>
    </div>
  );
}
