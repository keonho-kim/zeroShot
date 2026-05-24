import { Card } from "@/shared/ui/card";
import { CodexLoadingPanel } from "@/widgets/codex-loading/CodexLoadingPanel";
import { useI18n } from "@/lib/i18n";
import type { ArchitectProgressController } from "@/pages/architect-progress/page-controller";

export function ArchitectLoadingSection({ controller }: { controller: ArchitectProgressController }) {
  const { t } = useI18n();

  return (
    <Card className="architect-loading-card" aria-label="Architect progress">
      <CodexLoadingPanel
        label={t("architect.analyzing")}
        progressItems={controller.timelineItems}
        messages={controller.streamMessages}
        emptyMessage={t("architect.organizing")}
      />
      {controller.architectError ? (
        <p className="architect-error">{controller.architectError}</p>
      ) : null}
    </Card>
  );
}
