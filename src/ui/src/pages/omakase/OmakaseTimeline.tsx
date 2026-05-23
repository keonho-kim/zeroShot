import { CheckCircle2, Circle, Play } from "lucide-react";
import { omakaseStageLabel, omakaseStageOrder, type OmakaseStageStatus } from "@/entities/omakase/omakase-progress";
import type { OmakaseStage } from "@/types/api";

export function OmakaseTimeline({ statuses }: { statuses: Record<OmakaseStage, OmakaseStageStatus> }) {
  return (
    <div className="omakase-timeline" aria-label="Omakase progress">
      {omakaseStageOrder.map((stage) => {
        const status = statuses[stage];
        return (
          <div key={stage} className={`omakase-timeline-item ${status}`}>
            <span className="omakase-timeline-icon">
              {status === "completed" ? <CheckCircle2 aria-hidden="true" /> : status === "running" ? <Play aria-hidden="true" /> : <Circle aria-hidden="true" />}
            </span>
            <strong>{omakaseStageLabel(stage)}</strong>
          </div>
        );
      })}
    </div>
  );
}
