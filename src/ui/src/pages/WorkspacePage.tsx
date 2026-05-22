import { useQuery } from "@tanstack/react-query";
import { Bot, Boxes, DraftingCompass, GitBranch, Paintbrush } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { fetchProjectState } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";
import { useBodyClass } from "@/hooks/useBodyClass";
import { canStartBuild, canStartDesign, canStartUpdate } from "@/entities/project/project-core";
import { isMissingSelectedProjectError } from "@/entities/project/stale-project";
import { cn } from "@/utils/cn";

function formatProjectName(projectRoot: string): string {
  const parts = projectRoot.split("/").filter(Boolean);
  return parts.at(-1) || projectRoot;
}

function ActionCard({
  title,
  eyebrow,
  description,
  icon,
  accent,
  disabled,
  onClick
}: {
  title: string;
  eyebrow: string;
  description: string;
  icon: React.ReactNode;
  accent: "cyan" | "amber" | "mint";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "action-card text-left",
        accent === "cyan" ? "action-card-cyan" : accent === "amber" ? "action-card-amber" : "action-card-mint"
      )}
    >
      <div className="action-card-icon">
        {icon}
      </div>
      <p className="action-card-eyebrow">{eyebrow}</p>
      <p className="action-card-title">{title}</p>
      <p className="action-card-description">{description}</p>
    </button>
  );
}

export function WorkspacePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const projectRoot = useAppStore((state) => state.projectRoot);
  const setProjectRoot = useAppStore((state) => state.setProjectRoot);
  const projectState = useAppStore((state) => state.projectState);
  const setProjectState = useAppStore((state) => state.setProjectState);
  const setCandidateProjectPath = useAppStore((state) => state.setCandidateProjectPath);
  const setSelectedBrowserEntryPath = useAppStore((state) => state.setSelectedBrowserEntryPath);

  const projectStateQuery = useQuery({
    queryKey: ["project-state", projectRoot],
    queryFn: () => fetchProjectState(projectRoot),
    enabled: Boolean(projectRoot),
    retry: (failureCount, error) => !isMissingSelectedProjectError(error) && failureCount < 3
  });

  useBodyClass("home-page");

  useEffect(() => {
    if (!projectRoot) {
      setProjectState(null);
      return;
    }
    setProjectState(projectStateQuery.data ?? null);
  }, [projectRoot, projectStateQuery.data, setProjectState]);

  useEffect(() => {
    if (!projectRoot || !isMissingSelectedProjectError(projectStateQuery.error)) {
      return;
    }
    setProjectRoot("");
    setProjectState(null);
    setCandidateProjectPath("");
    setSelectedBrowserEntryPath("");
    navigate("/home", { replace: true });
  }, [navigate, projectRoot, projectStateQuery.error, setCandidateProjectPath, setProjectRoot, setProjectState, setSelectedBrowserEntryPath]);

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  const buildEnabled = Boolean(projectState && canStartBuild(projectState));
  const designDisabled = !projectState || !canStartDesign(projectState);
  const buildDisabled = !buildEnabled;
  const updateEnabled = Boolean(projectState && canStartUpdate(projectState));
  const updateDisabled = !updateEnabled;
  const buildReason = projectState ? t("build.disabled") : t("home.architectNoProject");
  const updateReason = projectState
    ? projectState.runsCount < 1
      ? t("update.needsBuild")
      : t("update.noSourceToUpdate")
    : t("home.architectNoProject");

  return (
    <div className="home-shell mx-auto flex max-w-[1180px] flex-col gap-6 md:gap-8">
      <PageHeader title="ZERO SHOT" rightAction="settings" />
      <section className="home-console" aria-label={t("settings.selectedProject")}>
        <div className="home-console-topline">
          <span>{t("home.projectSlot")}</span>
          <span>{t("common.ready")}</span>
        </div>

        <div className="min-w-0">
          <p className="home-console-title">{formatProjectName(projectRoot)}</p>
          <p className="home-console-path" title={projectRoot}>
            {projectRoot}
          </p>
        </div>

        <div className="home-status-grid">
          <div>
            <span>{t("home.productBlueprint")}</span>
            <strong>{projectState?.hasProductHtml ? t("common.ready") : t("common.wait")}</strong>
          </div>
          <div>
            <span>{t("home.workspace")}</span>
            <strong>{projectState ? (projectState.isDirectoryEmpty ? t("common.empty") : t("common.files")) : t("common.wait")}</strong>
          </div>
          <div>
            <span>{t("home.designBrief")}</span>
            <strong>{projectState?.hasDesign ? t("common.ready") : t("common.wait")}</strong>
          </div>
          <div>
            <span>{t("home.updateRequest")}</span>
            <strong>{projectState?.hasUpdate ? t("common.ready") : t("common.none")}</strong>
          </div>
          <div>
            <span>{t("home.source")}</span>
            <strong>{projectState?.hasSourceCode ? t("home.filesCount", { count: projectState.sourceFileCount }) : t("common.none")}</strong>
          </div>
          <div>
            <span>{t("home.runs")}</span>
            <strong>{projectState?.runsCount ?? 0}</strong>
          </div>
        </div>
      </section>

      <div className="home-action-stack">
        <ActionCard
          title="ARCHITECT"
          eyebrow={t("home.blueprintQuest")}
          description={projectState?.hasProductHtml ? t("home.architectExisting") : t("home.architectNew")}
          icon={<DraftingCompass aria-hidden="true" />}
          accent="cyan"
          onClick={() => navigate("/architect")}
        />
        <ActionCard
          title="DESIGN"
          eyebrow={t("home.designRuntime")}
          description={designDisabled
            ? t("home.designNoProduct")
            : projectState?.hasDesign
              ? t("home.designExisting")
              : t("home.designNew")}
          icon={<Paintbrush aria-hidden="true" />}
          accent="amber"
          disabled={designDisabled}
          onClick={() => navigate("/makeover")}
        />
        <ActionCard
          title="BUILD"
          eyebrow={t("home.codexRun")}
          description={buildDisabled ? buildReason : t("home.buildReady")}
          icon={buildDisabled ? <Boxes aria-hidden="true" /> : <Bot aria-hidden="true" />}
          accent="mint"
          disabled={buildDisabled}
          onClick={() => navigate("/build")}
        />
        <ActionCard
          title="UPDATE"
          eyebrow={t("home.afterBuild")}
          description={updateDisabled ? updateReason : t("home.updateReady")}
          icon={<GitBranch aria-hidden="true" />}
          accent="cyan"
          disabled={updateDisabled}
          onClick={() => navigate("/update")}
        />
      </div>
    </div>
  );
}
