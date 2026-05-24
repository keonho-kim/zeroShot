import { X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { useI18n } from "@/lib/i18n";

export function ArchitectOverlays(props: {
  blueprintHtml: string;
  blueprintOpen: boolean;
  continuePromptOpen: boolean;
  tutorialOpen: boolean;
  createBlueprintPending: boolean;
  onCloseBlueprint: () => void;
  onContinueDesign: () => void;
  onDismissContinue: () => void;
}) {
  const { t } = useI18n();

  return (
    <>
      {props.tutorialOpen ? (
        <div className="blueprint-tutorial" role="dialog" aria-modal="true" aria-label="Blueprint tutorial">
          <div className="tutorial-callout">
            <p>{t("architect.previewHint")}</p>
          </div>
        </div>
      ) : null}
      {props.blueprintOpen ? (
        <div className="blueprint-viewer-backdrop" role="dialog" aria-modal="true" aria-label="Product blueprint">
          <div className="blueprint-viewer">
            <button type="button" className="blueprint-close" aria-label="Close blueprint" onClick={props.onCloseBlueprint}>
              <X className="size-6" />
            </button>
            <iframe title="Product blueprint" srcDoc={props.blueprintHtml} />
          </div>
        </div>
      ) : null}
      {props.continuePromptOpen ? (
        <div className="app-modal-backdrop" role="dialog" aria-modal="true" aria-label="Continue destination">
          <Card className="app-modal">
            <p className="modal-eyebrow">CONTINUE TO?</p>
            <h2>{t("architect.nextStep")}</h2>
            <p>{t("architect.nextStepDetail")}</p>
            <div className="modal-actions">
              <Button
                variant="outline"
                disabled={props.createBlueprintPending}
                onClick={props.onContinueDesign}
              >
                DESIGN
              </Button>
              <Button variant="outline" onClick={props.onDismissContinue}>{t("common.cancel")}</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
