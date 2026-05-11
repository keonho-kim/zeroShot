import { useQuery } from "@tanstack/react-query";
import { DraftingCompass, Hammer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ProjectPickerModal } from "../components/ProjectPickerModal";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { fetchProjectState } from "../lib/api";
import { useAppStore } from "../app/store";
import { buildDisabledReason, canStartBuild } from "../entities/project/project-core";

function ActionCard({
  title,
  description,
  icon,
  disabled,
  onClick
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-[220px] rounded-lg bg-[var(--panel)] p-8 text-left transition hover:bg-[var(--surface)] md:p-9 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-[var(--panel)]"
    >
      <div className="mb-6 flex size-12 items-center justify-center rounded-md bg-[var(--surface)] text-[var(--primary)]">
        {icon}
      </div>
      <p className="text-2xl font-semibold tracking-[-0.02em]">{title}</p>
      <p className="mt-3 max-w-[28ch] text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
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

  useEffect(() => {
    document.body.classList.add("home-page");
    if (!projectRoot) {
      setProjectPickerOpen(true);
    }

    return () => {
      document.body.classList.remove("home-page");
    };
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
  const buildDisabled = !buildEnabled;
  const buildReason = projectState ? buildDisabledReason(projectState) : "프로젝트를 먼저 선택하세요.";
  const openProjectPicker = () => {
    setProjectBrowserPath("");
    setCandidateProjectPath(projectRoot || candidateProjectPath);
    setProjectPickerOpen(true);
  };

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-8 md:gap-10">
      <PageHeader title="PHASE HOME" rightAction="settings" />
      <Card className="flex flex-col gap-5 bg-transparent p-0">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-start">
          <div>
            <p className="text-lg font-semibold">Selected Project</p>
            <p className="mt-1 break-all text-sm text-[var(--muted-foreground)]">{projectRoot || "아직 선택되지 않았습니다."}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {projectRoot ? (
              <Button variant="outline" onClick={openProjectPicker}>
                프로젝트 변경
              </Button>
            ) : null}
            {projectRoot ? <Button variant="outline" onClick={() => setProjectRoot("")}>선택 해제</Button> : null}
          </div>
        </div>
        {projectState ? (
          <div className="grid gap-2 rounded-md bg-[var(--surface)] p-4 text-sm text-[var(--muted-foreground)] md:grid-cols-2 xl:grid-cols-4">
            <p>PRODUCT.html: {projectState.hasProductHtml ? "존재" : "없음"}</p>
            <p>Workspace: {projectState.isDirectoryEmpty ? "비어 있음" : "파일 있음"}</p>
            <p>UPDATE.md: {projectState.hasUpdate ? "존재" : "없음"}</p>
            <p>.work.history runs: {projectState.runsCount}</p>
          </div>
        ) : !projectRoot ? (
          <button
            type="button"
            onClick={openProjectPicker}
            className="w-full rounded-lg bg-[var(--surface)] p-7 text-left text-sm text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)]"
          >
            먼저 워크스페이스를 선택한 다음 ARCHITECT 또는 BUILD를 진행합니다.
          </button>
        ) : null}
      </Card>
      <div className="grid gap-5 md:grid-cols-2 xl:gap-6">
        <ActionCard
          title="ARCHITECT"
          description={architectDisabled ? "프로젝트를 먼저 선택하세요." : "대화를 통해 PRODUCT.html blueprint를 만듭니다."}
          icon={<DraftingCompass className="size-6" />}
          disabled={architectDisabled}
          onClick={() => navigate("/architect")}
        />
        <ActionCard
          title="BUILD"
          description={buildDisabled ? buildReason : "PRODUCT.html 또는 기존 프로젝트 파일을 바탕으로 빌드를 시작합니다."}
          icon={<Hammer className="size-6" />}
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
