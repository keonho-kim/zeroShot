import { Bot } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/shared/ui/card";
import { LogViewer } from "@/widgets/job-log/LogViewer";
import type { JobSnapshot } from "@/types/api";

export function BuildRunScreen({ job }: { job: JobSnapshot }) {
  const { t } = useI18n();
  return (
    <div className="build-run-screen">
      <Card className="agent-panel build-run-heading bg-[var(--panel)]">
        <div className="agent-panel-heading">
          <div className="agent-panel-icon">
            <Bot aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="agent-panel-kicker">{t("build.agent")}</p>
            <h2>{job.status === "completed" ? t("build.completed") : job.status === "failed" ? t("build.failed") : t("build.running")}</h2>
            <p>{t("build.runningDetail")}</p>
          </div>
        </div>
      </Card>
      <LogViewer job={job} />
    </div>
  );
}
