import { useQuery } from "@tanstack/react-query";
import { FilePenLine, Logs, Wrench, Hammer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ProjectPickerModal } from "../components/ProjectPickerModal";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { fetchProjectState } from "../lib/api";
import { useAppStore } from "../app/store";

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
      className="min-h-[240px] rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-9 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[var(--surface-active)] hover:bg-[var(--surface-hover)] md:p-10 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:border-[var(--border)] disabled:hover:bg-[var(--card)]"
    >
      <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--primary)]">
        {icon}
      </div>
      <p className="text-2xl font-black tracking-tight">{title}</p>
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

    return () => {
      document.body.classList.remove("home-page");
    };
  }, []);

  useEffect(() => {
    if (!projectRoot) {
      setProjectState(null);
      return;
    }
    setProjectState(projectStateQuery.data ?? null);
  }, [projectRoot, projectStateQuery.data, setProjectState]);

  const nextPipelineMode = projectState?.updateEnabled ? "update" : "build";
  const disabled = !projectRoot;
  const openProjectPicker = () => {
    setProjectBrowserPath("");
    setCandidateProjectPath(projectRoot || candidateProjectPath);
    setProjectPickerOpen(true);
  };

  return (
    <div className="mx-auto max-w-[1320px] space-y-8 md:space-y-10">
      <PageHeader title="PHASE HOME" rightAction="settings" />
      <Card className="space-y-5 p-6 md:p-7">
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
          <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60 p-5 text-sm text-[var(--muted-foreground)] md:grid-cols-2 xl:grid-cols-4">
            <p>PRODUCT.md: {projectState.hasProduct ? "존재" : "없음"}</p>
            <p>UPDATE.md: {projectState.hasUpdate ? "존재" : "없음"}</p>
            <p>.work.history runs: {projectState.runsCount}</p>
            <p>다음 파이프라인: {nextPipelineMode.toUpperCase()}</p>
          </div>
        ) : !projectRoot ? (
          <button
            type="button"
            onClick={openProjectPicker}
            className="w-full rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-7 text-left text-sm text-[var(--muted-foreground)] transition hover:border-[var(--primary)] hover:bg-[var(--surface-hover)]"
          >
            프로젝트를 먼저 선택해야 BUILD/UPDATE, EDITOR, LOGS를 사용할 수 있습니다.
          </button>
        ) : null}
      </Card>
      <div className="grid gap-5 xl:grid-cols-3 xl:gap-6">
        <ActionCard
          title={nextPipelineMode.toUpperCase()}
          description={disabled ? "프로젝트를 먼저 선택하세요." : nextPipelineMode === "build" ? "새 프로젝트 실행을 시작합니다." : "기존 로그가 있는 프로젝트를 업데이트합니다."}
          icon={nextPipelineMode === "build" ? <Hammer className="size-6" /> : <Wrench className="size-6" />}
          disabled={disabled}
          onClick={() => navigate(`/${nextPipelineMode}`)}
        />
        <ActionCard
          title="EDITOR"
          description={disabled ? "프로젝트를 먼저 선택하세요." : "선택된 프로젝트 루트 내부 파일을 편집합니다."}
          icon={<FilePenLine className="size-6" />}
          disabled={disabled}
          onClick={() => navigate("/editor")}
        />
        <ActionCard
          title="LOGS"
          description={disabled ? "프로젝트를 먼저 선택하세요." : ".work.history 기반 실행 기록과 문서를 확인합니다."}
          icon={<Logs className="size-6" />}
          disabled={disabled}
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
