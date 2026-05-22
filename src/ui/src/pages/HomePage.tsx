import { useQuery } from "@tanstack/react-query";
import { Bot, Boxes, DraftingCompass, FolderOpen, GitBranch, Paintbrush, RotateCcw, ScrollText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ProjectPickerModal } from "@/components/ProjectPickerModal";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { fetchProjectState } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";
import { useBodyClass } from "@/hooks/useBodyClass";
import { canStartBuild, canStartDesign, canStartUpdate } from "@/entities/project/project-core";
import { clearMissingProjectSelection, isMissingSelectedProjectError } from "@/entities/project/stale-project";
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

export function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const projectRoot = useAppStore((state) => state.projectRoot);
  const isProjectPickerOpen = useAppStore((state) => state.isProjectPickerOpen);
  const candidateProjectPath = useAppStore((state) => state.candidateProjectPath);
  const projectBrowserPath = useAppStore((state) => state.projectBrowserPath);
  const setProjectRoot = useAppStore((state) => state.setProjectRoot);
  const projectState = useAppStore((state) => state.projectState);
  const setProjectState = useAppStore((state) => state.setProjectState);
  const setProjectPickerOpen = useAppStore((state) => state.setProjectPickerOpen);
  const setProjectBrowserPath = useAppStore((state) => state.setProjectBrowserPath);
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
      setProjectPickerOpen(true);
    }
  }, [projectRoot, setProjectPickerOpen]);

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
    clearMissingProjectSelection({
      setProjectRoot,
      setProjectState,
      setCandidateProjectPath,
      setSelectedBrowserEntryPath,
      setProjectPickerOpen
    });
  }, [projectRoot, projectStateQuery.error, setCandidateProjectPath, setProjectPickerOpen, setProjectRoot, setProjectState, setSelectedBrowserEntryPath]);

  const buildEnabled = Boolean(projectRoot && projectState && canStartBuild(projectState));
  const architectDisabled = !projectRoot;
  const designDisabled = !projectRoot || !projectState || !canStartDesign(projectState);
  const buildDisabled = !buildEnabled;
  const updateEnabled = Boolean(projectRoot && projectState && canStartUpdate(projectState));
  const updateDisabled = !updateEnabled;
  const buildReason = projectState ? t("build.disabled") : t("home.architectNoProject");
  const updateReason = projectState
    ? projectState.runsCount < 1
      ? t("update.needsBuild")
      : t("update.noSourceToUpdate")
    : t("home.architectNoProject");
  const openProjectPicker = () => {
    const initialPath = projectRoot || candidateProjectPath;
    setProjectBrowserPath("");
    setCandidateProjectPath(initialPath);
    setSelectedBrowserEntryPath(initialPath);
    setProjectPickerOpen(true);
  };

  return (
    <div className="home-shell mx-auto flex max-w-[1180px] flex-col gap-6 md:gap-8">
      <PageHeader title="ZERO SHOT" rightAction="settings" />
      <section className="home-console" aria-label={t("settings.selectedProject")}>
        <div className="home-console-topline">
          <span>{t("home.projectSlot")}</span>
          <span>{projectRoot ? t("common.ready") : t("common.empty")}</span>
        </div>

        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="min-w-0">
            <p className="home-console-title">{projectRoot ? formatProjectName(projectRoot) : t("home.noProject")}</p>
            <p className="home-console-path" title={projectRoot || t("home.selectWorkspace")}>
              {projectRoot || t("home.selectWorkspace")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={openProjectPicker}>
              <FolderOpen aria-hidden="true" />
              {projectRoot ? t("home.changeProject") : t("home.selectProject")}
            </Button>
            {projectRoot ? (
              <Button variant="outline" onClick={() => setProjectRoot("")} aria-label={t("home.clearProject")} title={t("home.clearProject")}>
                <RotateCcw aria-hidden="true" />
              </Button>
            ) : null}
          </div>
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
          description={architectDisabled
            ? t("home.architectNoProject")
            : projectState?.hasProductHtml
              ? t("home.architectExisting")
              : t("home.architectNew")}
          icon={<DraftingCompass aria-hidden="true" />}
          accent="cyan"
          disabled={architectDisabled}
          onClick={() => navigate("/architect")}
        />
        <ActionCard
          title="MAKEOVER"
          eyebrow={t("home.designRuntime")}
          description={!projectRoot
            ? t("home.architectNoProject")
            : designDisabled
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
        <ActionCard
          title="LOGS"
          eyebrow={t("home.logsArchive")}
          description={t("home.logsReady")}
          icon={<ScrollText aria-hidden="true" />}
          accent="mint"
          onClick={() => navigate("/logs")}
        />
      </div>
      <ProjectPickerModal
        open={isProjectPickerOpen}
        onClose={() => {
          setProjectPickerOpen(false);
          if (!projectBrowserPath) {
            setCandidateProjectPath(projectRoot);
          }
        }}
      />
    </div>
  );
}
