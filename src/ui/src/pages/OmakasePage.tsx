import { Bot, Play } from "lucide-react";
import { Navigate } from "react-router-dom";
import { omakaseProjectName } from "@/entities/omakase/omakase-progress";
import { useI18n } from "@/lib/i18n";
import { useOmakasePageController } from "@/pages/omakase/page-controller";
import { OmakaseLogViewer } from "@/pages/omakase/OmakaseLogViewer";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Textarea } from "@/shared/ui/textarea";

export function OmakasePage() {
  const { t } = useI18n();
  const controller = useOmakasePageController();

  if (!controller.projectRoot) {
    return <Navigate to="/home" replace />;
  }

  const running = controller.runStatus === "running";
  const statusLabel = controller.runStatus === "failed"
    ? t("home.omakaseFailed")
    : controller.runStatus === "completed"
      ? t("common.ready")
      : running
        ? t("common.loading")
        : t("common.wait");

  return (
    <div className="home-shell omakase-page mx-auto flex max-w-[1180px] flex-col gap-6 md:gap-8">
      <PageHeader title="OMAKASE" projectRoot={controller.projectRoot} />
      <section className="home-console" aria-label="Omakase project">
        <div className="home-console-topline">
          <span>{t("home.projectSlot")}</span>
          <span>{statusLabel}</span>
        </div>
        <div className="min-w-0">
          <p className="home-console-title">{omakaseProjectName(controller.projectRoot)}</p>
          <p className="home-console-path" title={controller.projectRoot}>
            {controller.projectRoot}
          </p>
        </div>
      </section>
      {controller.runStatus === "idle" ? (
        <Card className="omakase-input-card">
          <div className="agent-panel-heading">
            <div className="agent-panel-icon">
              <Bot aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="agent-panel-kicker">{t("home.omakaseEyebrow")}</p>
              <h2>{t("home.omakasePromptTitle")}</h2>
              <p>{t("home.omakasePromptDescription")}</p>
            </div>
          </div>
          <Textarea
            value={controller.brief}
            onChange={(event) => controller.setBrief(event.target.value)}
            placeholder={t("home.omakasePlaceholder")}
          />
          <div className="omakase-actions">
            <Button disabled={!controller.brief.trim()} onClick={controller.startOmakase}>
              <Play className="size-4" />
              {t("home.omakaseRun")}
            </Button>
          </div>
        </Card>
      ) : (
        <OmakaseLogViewer
          error={controller.error}
          messages={controller.messages}
          onRetry={controller.startOmakase}
          progressItems={controller.progressItems}
          runStatus={controller.runStatus}
          statuses={controller.stageStatuses}
        />
      )}
    </div>
  );
}
