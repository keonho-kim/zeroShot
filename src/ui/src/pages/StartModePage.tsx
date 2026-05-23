import { Bot, SlidersHorizontal } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";
import { useBodyClass } from "@/hooks/useBodyClass";

function projectName(projectRoot: string): string {
  return projectRoot.split("/").filter(Boolean).at(-1) || projectRoot;
}

export function StartModePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const projectRoot = useAppStore((state) => state.projectRoot);

  useBodyClass("home-page");

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="home-shell mx-auto flex max-w-[1180px] flex-col gap-6 md:gap-8">
      <PageHeader title="ZERO SHOT" projectRoot={projectRoot} />
      <section className="home-console" aria-label={t("home.startMode")}>
        <div className="home-console-topline">
          <span>{t("home.projectSlot")}</span>
          <span>{t("home.startMode")}</span>
        </div>
        <div className="min-w-0">
          <p className="home-console-title">{projectName(projectRoot)}</p>
          <p className="home-console-path" title={projectRoot}>
            {projectRoot}
          </p>
        </div>
      </section>

      <div className="home-action-stack start-mode-grid">
        <button type="button" className="action-card action-card-cyan text-left" onClick={() => navigate("/workspace")}>
          <div className="action-card-icon">
            <SlidersHorizontal aria-hidden="true" />
          </div>
          <p className="action-card-eyebrow">{t("home.manualEyebrow")}</p>
          <p className="action-card-title">MANUAL MODE</p>
          <p className="action-card-description">{t("home.manualDescription")}</p>
        </button>
        <button type="button" className="action-card action-card-mint text-left" onClick={() => navigate("/omakase")}>
          <div className="action-card-icon">
            <Bot aria-hidden="true" />
          </div>
          <p className="action-card-eyebrow">{t("home.omakaseEyebrow")}</p>
          <p className="action-card-title">OMAKASE MODE</p>
          <p className="action-card-description">{t("home.omakaseDescription")}</p>
        </button>
      </div>
    </div>
  );
}
