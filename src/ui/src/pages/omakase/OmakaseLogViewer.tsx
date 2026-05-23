import { type OmakaseProgressItem, type OmakaseRunStatus, type OmakaseStageStatus } from "@/entities/omakase/omakase-progress";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/shared/ui/card";
import { CodexLoadingPanel } from "@/widgets/codex-loading/CodexLoadingPanel";
import { OmakaseTimeline } from "@/pages/omakase/OmakaseTimeline";
import type { OmakaseStage } from "@/types/api";

export function OmakaseLogViewer({
  messages,
  progressItems,
  runStatus,
  statuses
}: {
  messages: string[];
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
    </Card>
  );
}
