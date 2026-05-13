import { useQuery } from "@tanstack/react-query";
import { Bot, Boxes, DraftingCompass, FolderOpen, Paintbrush, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ProjectPickerModal } from "@/components/ProjectPickerModal";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { fetchProjectState } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { useBodyClass } from "@/hooks/useBodyClass";
import { buildDisabledReason, canStartBuild, canStartDesign } from "@/entities/project/project-core";
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
        "action-card min-h-[236px] text-left",
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

  const projectStateQuery = useQuery({
    queryKey: ["project-state", projectRoot],
    queryFn: () => fetchProjectState(projectRoot),
    enabled: Boolean(projectRoot)
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

  const buildEnabled = Boolean(projectRoot && projectState && canStartBuild(projectState));
  const architectDisabled = !projectRoot;
  const designDisabled = !projectRoot || !projectState || !canStartDesign(projectState);
  const buildDisabled = !buildEnabled;
  const buildReason = projectState ? buildDisabledReason(projectState) : "프로젝트를 먼저 선택하세요.";
  const openProjectPicker = () => {
    setProjectBrowserPath("");
    setCandidateProjectPath(projectRoot || candidateProjectPath);
    setProjectPickerOpen(true);
  };

  return (
    <div className="home-shell mx-auto flex max-w-[1320px] flex-col gap-8 md:gap-10">
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
            <span>RUNS</span>
            <strong>{projectState?.runsCount ?? 0}</strong>
          </div>
        </div>
      </section>

      <div className="home-action-stack">
        <ActionCard
          title="ARCHITECT"
          eyebrow="BLUEPRINT QUEST"
          description={architectDisabled ? "프로젝트를 먼저 선택하세요." : "대화를 통해 PRODUCT BLUEPRINT를 만듭니다."}
          icon={<DraftingCompass aria-hidden="true" />}
          accent="cyan"
          disabled={architectDisabled}
          onClick={() => navigate("/architect")}
        />
        <ActionCard
          title="DESIGN"
          eyebrow="OPEN DESIGN RUNTIME"
          description={!projectRoot ? "프로젝트를 먼저 선택하세요." : designDisabled ? "PRODUCT BLUEPRINT를 먼저 만드세요." : "Codex 생성, 와이어 프레임 편집, 프레젠테이션 편집 흐름을 설계합니다."}
          icon={<Paintbrush aria-hidden="true" />}
          accent="amber"
          disabled={designDisabled}
          onClick={() => navigate("/design")}
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
