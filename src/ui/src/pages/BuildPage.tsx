import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, FileCode2, Play } from "lucide-react";
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { fetchProjectState, startBuild } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { LogViewer } from "@/components/LogViewer";

function projectName(projectRoot: string): string {
  return projectRoot.split("/").filter(Boolean).at(-1) || projectRoot;
}

export function BuildPage() {
  const projectRoot = useAppStore((state) => state.projectRoot);
  const setProjectState = useAppStore((state) => state.setProjectState);
  const currentJob = useAppStore((state) => state.currentJob);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
  const clearLogs = useAppStore((state) => state.clearLogs);
  const responseLanguage = navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";

  const stateQuery = useQuery({
    queryKey: ["project-state", projectRoot],
    queryFn: () => fetchProjectState(projectRoot),
    enabled: Boolean(projectRoot)
  });

  useEffect(() => {
    setProjectState(stateQuery.data ?? null);
  }, [setProjectState, stateQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      clearLogs();
      return startBuild({
        projectRoot,
        options: { responseLanguage }
      });
    },
    onSuccess: (job) => {
      setCurrentJob(job);
    }
  });

  const projectState = stateQuery.data;
  const disabled = !projectRoot || mutation.isPending || !projectState?.buildEnabled;
  const buildJob = currentJob?.mode === "build" ? currentJob : null;
  const showBuildRun = Boolean(buildJob);

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="builder-shell">
      <PageHeader title="BUILD" projectRoot={projectRoot} />
      {showBuildRun ? (
        <div className="build-run-screen">
          <Card className="agent-panel build-run-heading bg-[var(--panel)]">
            <div className="agent-panel-heading">
              <div className="agent-panel-icon">
                <Bot aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="agent-panel-kicker">CODEX AGENT</p>
                <h2>{buildJob?.status === "completed" ? "Build completed" : buildJob?.status === "failed" ? "Build failed" : "Build is running"}</h2>
                <p>PRODUCT 명세와 DESIGN 캔버스를 기준으로 구현 작업을 진행합니다.</p>
              </div>
            </div>
          </Card>
          <LogViewer job={buildJob} />
        </div>
      ) : (
        <Card className="build-setup-card bg-[var(--panel)]">
          <div className="agent-panel-heading">
            <div className="agent-panel-icon">
              <FileCode2 aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="agent-panel-kicker">BUILD PIPELINE</p>
              <h2>START BUILD</h2>
              <p>현재 PRODUCT 명세와 DESIGN 캔버스를 참고해 구현 작업을 시작합니다.</p>
            </div>
          </div>

          <div className="agent-status-grid">
            <div>
              <span>PROJECT</span>
              <strong title={projectRoot}>{projectName(projectRoot)}</strong>
            </div>
            <div>
              <span>PRODUCT</span>
              <strong>{projectState?.hasProductHtml ? "READY" : "MISSING"}</strong>
            </div>
            <div>
              <span>DESIGN</span>
              <strong>{projectState?.hasDesign ? "READY" : "OPTIONAL"}</strong>
            </div>
            <div>
              <span>GOAL</span>
              <strong>TEST + SPEC CHECK</strong>
            </div>
          </div>

          {projectState?.buildEnabled ? null : (
            <p className="architect-error">BUILD에는 PRODUCT 명세 또는 비어 있지 않은 워크스페이스가 필요합니다.</p>
          )}
          {mutation.isError ? (
            <p className="architect-error">{mutation.error instanceof Error ? mutation.error.message : "BUILD를 시작하지 못했습니다."}</p>
          ) : null}

          <div className="build-setup-actions">
            <Button disabled={disabled} onClick={() => mutation.mutate()}>
              <Play aria-hidden="true" className="size-4" />
              {mutation.isPending ? "BUILD 시작 중..." : "START BUILD"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
