import { useQuery } from "@tanstack/react-query";
import { Bot, Boxes, DraftingCompass, FolderOpen, GitBranch, Paintbrush, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ProjectPickerModal } from "@/components/ProjectPickerModal";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { fetchProjectState } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { useBodyClass } from "@/hooks/useBodyClass";
import { buildDisabledReason, canStartBuild, canStartDesign, canStartUpdate, updateDisabledReason } from "@/entities/project/project-core";
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
        "action-card min-h-[188px] text-left",
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
  const buildReason = projectState ? buildDisabledReason(projectState) : "프로젝트를 먼저 선택하세요.";
  const updateReason = projectState ? updateDisabledReason(projectState) : "프로젝트를 먼저 선택하세요.";
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
      <section className="home-console" aria-label="Selected project">
        <div className="home-console-topline">
          <span>PROJECT SLOT</span>
          <span>{projectRoot ? "READY" : "EMPTY"}</span>
        </div>

        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="min-w-0">
            <p className="home-console-title">{projectRoot ? formatProjectName(projectRoot) : "No project selected"}</p>
            <p className="home-console-path" title={projectRoot || "Select a workspace to continue"}>
              {projectRoot || "워크스페이스를 선택하면 ARCHITECT, DESIGN, BUILD가 활성화됩니다."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={openProjectPicker}>
              <FolderOpen aria-hidden="true" />
              {projectRoot ? "Change Project" : "Select Project"}
            </Button>
            {projectRoot ? (
              <Button variant="outline" onClick={() => setProjectRoot("")} aria-label="Clear selected project" title="Clear selected project">
                <RotateCcw aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="home-status-grid">
          <div>
            <span>PRODUCT BLUEPRINT</span>
            <strong>{projectState?.hasProductHtml ? "READY" : "WAIT"}</strong>
          </div>
          <div>
            <span>WORKSPACE</span>
            <strong>{projectState ? (projectState.isDirectoryEmpty ? "EMPTY" : "FILES") : "WAIT"}</strong>
          </div>
          <div>
            <span>DESIGN BRIEF</span>
            <strong>{projectState?.hasDesign ? "READY" : "WAIT"}</strong>
          </div>
          <div>
            <span>UPDATE REQUEST</span>
            <strong>{projectState?.hasUpdate ? "READY" : "NONE"}</strong>
          </div>
          <div>
            <span>SOURCE</span>
            <strong>{projectState?.hasSourceCode ? `${projectState.sourceFileCount} FILES` : "NONE"}</strong>
          </div>
          <div>
            <span>RUNS</span>
            <strong>{projectState?.runsCount ?? 0}</strong>
          </div>
        </div>
      </section>

      <div className="home-action-stack">
        <ActionCard
          title="ARCHITECT"
          eyebrow="BLUEPRINT QUEST"
          description={architectDisabled
            ? "프로젝트를 먼저 선택하세요."
            : projectState?.hasProductHtml
              ? "기존 PRODUCT BLUEPRINT를 챗으로 이어서 조정합니다."
              : "대화를 통해 PRODUCT BLUEPRINT를 만듭니다."}
          icon={<DraftingCompass aria-hidden="true" />}
          accent="cyan"
          disabled={architectDisabled}
          onClick={() => navigate("/architect")}
        />
        <ActionCard
          title="DESIGN"
          eyebrow="OPEN DESIGN RUNTIME"
          description={!projectRoot
            ? "프로젝트를 먼저 선택하세요."
            : designDisabled
              ? "PRODUCT BLUEPRINT를 먼저 만드세요."
              : projectState?.hasDesign
                ? "기존 INTERACTIVE CANVAS를 챗으로 계속 편집합니다."
                : "PRODUCT BLUEPRINT를 기반으로 새 INTERACTIVE CANVAS를 만듭니다."}
          icon={<Paintbrush aria-hidden="true" />}
          accent="amber"
          disabled={designDisabled}
          onClick={() => navigate("/makeover")}
        />
        <ActionCard
          title="BUILD"
          eyebrow="CODEX AGENT RUN"
          description={buildDisabled ? buildReason : "제품 블루프린트 또는 기존 프로젝트 파일을 바탕으로 빌드를 시작합니다."}
          icon={buildDisabled ? <Boxes aria-hidden="true" /> : <Bot aria-hidden="true" />}
          accent="mint"
          disabled={buildDisabled}
          onClick={() => navigate("/build")}
        />
        <ActionCard
          title="UPDATE"
          eyebrow="AFTER BUILD"
          description={updateDisabled ? updateReason : "BUILD 이후 생성된 소스코드를 바탕으로 변경 요청을 적용합니다."}
          icon={<GitBranch aria-hidden="true" />}
          accent="cyan"
          disabled={updateDisabled}
          onClick={() => navigate("/update")}
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
