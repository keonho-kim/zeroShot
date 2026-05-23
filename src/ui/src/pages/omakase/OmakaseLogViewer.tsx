import { RotateCcw } from "lucide-react";
import { type OmakaseProgressItem, type OmakaseRunStatus, type OmakaseStageStatus } from "@/entities/omakase/omakase-progress";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CodexLoadingPanel } from "@/widgets/codex-loading/CodexLoadingPanel";
import { OmakaseTimeline } from "@/pages/omakase/OmakaseTimeline";
import type { OmakaseStage } from "@/types/api";

export function OmakaseLogViewer({
  error,
  messages,
  onRetry,
  progressItems,
  runStatus,
  statuses
}: {
  error: string;
  messages: string[];
  onRetry: () => void;
  progressItems: OmakaseProgressItem[];
  runStatus: OmakaseRunStatus;
  statuses: Record<OmakaseStage, OmakaseStageStatus>;
}) {
  const { t } = useI18n();
  return (
    <Card className="omakase-log-panel">
      <OmakaseTimeline statuses={statuses} />
      <CodexLoadingPanel
        label="OMAKASE"
        noteTitle="ARCHITECT -> DESIGN -> BUILD"
        noteDetail="Codex is making the intermediate choices and running the full workflow."
        progressItems={progressItems}
        messages={messages}
        emptyMessage={runStatus === "idle" ? t("home.omakaseNotStarted") : t("log.waiting")}
      />
      {runStatus === "failed" ? (
        <div className="omakase-actions">
          {error ? <p className="architect-error">{error}</p> : null}
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw className="size-4" />
            {t("home.omakaseRetry")}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
