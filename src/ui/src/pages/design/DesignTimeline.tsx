import { CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import type { DesignTimelineItem } from "@/pages/design/design-page-model";

export function DesignTimeline({ items }: { items: DesignTimelineItem[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <Card className="architect-timeline" aria-label="Design runtime progress">
      <div className="timeline-heading">
        <p className="decision-kicker">Progress</p>
        <h2>DESIGN을 실행하고 있습니다.</h2>
        <div className="design-wave-heading" aria-hidden="true"><i /><i /><i /></div>
      </div>
      <div className="timeline-list">
        {items.map((item) => (
          <div className={cn("timeline-item", item.status)} key={item.id}>
            <div className="timeline-status" aria-hidden="true">
              {item.status === "completed" ? <CheckCircle2 aria-hidden="true" /> : <span className="design-wave-loader" aria-hidden="true"><i /><i /><i /></span>}
            </div>
            <div className="timeline-summary">
              <span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
              <span className="timeline-count">
                {item.updates.length}
                <Clock aria-hidden="true" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
