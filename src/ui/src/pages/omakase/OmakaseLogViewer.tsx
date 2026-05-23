import { RotateCcw } from "lucide-react";
import type { CodexLoadingLogSource } from "@/entities/codex/codex-loading-log";
import { type OmakaseProgressItem, type OmakaseRunStatus, type OmakaseStageStatus } from "@/entities/omakase/omakase-progress";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CodexLoadingPanel } from "@/widgets/codex-loading/CodexLoadingPanel";
import { OmakaseTimeline } from "@/pages/omakase/OmakaseTimeline";
import type { OmakaseStage } from "@/types/api";

export function OmakaseLogViewer({
  error,
  logSources,
  onRetry,
  progressItems,
  runStatus,
  statuses
}: {
  error: string;
  logSources: CodexLoadingLogSource[];
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
        progressItems={progressItems}
        sources={logSources}
        density="compact"
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
