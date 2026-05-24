import { Terminal } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LogViewer } from "@/widgets/job-log/LogViewer";
import type { JobSnapshot } from "@/types/api";

export function UpdateRunScreen({ job }: { job: JobSnapshot }) {
  const { t } = useI18n();
  return (
    <div className="build-run-screen">
      <section className="build-run-status-strip">
        <div className="agent-panel-heading">
          <div className="agent-panel-icon">
            <Terminal aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="agent-panel-kicker">{t("update.pipeline")}</p>
            <h2>{job.status === "completed" ? t("update.completed") : job.status === "failed" ? t("update.failed") : t("update.running")}</h2>
            <p>{t("update.runningDetail")}</p>
          </div>
        </div>
      </section>
      <LogViewer job={job} />
    </div>
  );
}
