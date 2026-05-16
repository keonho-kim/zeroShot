import { useMutation, useQuery } from "@tanstack/react-query";
import { Code2, FileText, GitBranch, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { fetchProjectState, startUpdate } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { updateDisabledReason } from "@/entities/project/project-core";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { RichPromptEditor } from "@/components/prompt/RichPromptEditor";
import { LogViewer } from "@/components/LogViewer";

function projectName(projectRoot: string): string {
  return projectRoot.split("/").filter(Boolean).at(-1) || projectRoot;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 102.4) / 10} KB`;
  }
  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`;
}

export function UpdatePage() {
  const projectRoot = useAppStore((state) => state.projectRoot);
  const setProjectState = useAppStore((state) => state.setProjectState);
  const currentJob = useAppStore((state) => state.currentJob);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
  const clearLogs = useAppStore((state) => state.clearLogs);
  const [updateContent, setUpdateContent] = useState("");

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
      return startUpdate({ projectRoot, updateContent });
    },
    onSuccess: (job) => {
      setCurrentJob(job);
    }
  });

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  const projectState = stateQuery.data;
  const disabled = !projectState?.updateEnabled || mutation.isPending || !updateContent.trim();
  const disabledReason = projectState ? updateDisabledReason(projectState) : "프로젝트 상태를 확인하고 있습니다.";
  const updateJob = currentJob?.mode === "update" ? currentJob : null;

  return (
    <div className="builder-shell">
      <PageHeader title="UPDATE" projectRoot={projectRoot} />
      <div className="build-workspace">
        <div className="flex flex-col gap-6">
          <Card className="agent-panel flex flex-col gap-4 bg-[var(--panel)]">
            <div className="agent-panel-heading">
              <div className="agent-panel-icon">
                <Terminal aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="agent-panel-kicker">UPDATE PIPELINE</p>
                <p className="text-lg font-semibold">Build 이후 소스코드를 업데이트합니다</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  최신 BUILD 결과와 현재 소스 언어 구성을 기준으로 Codex update 파이프라인을 실행합니다.
                </p>
              </div>
            </div>

            <div className="agent-status-grid">
              <div>
                <span>PROJECT</span>
                <strong title={projectRoot}>{projectName(projectRoot)}</strong>
              </div>
              <div>
                <span>LATEST RUN</span>
                <strong>{projectState?.latestRunName ?? "NONE"}</strong>
              </div>
              <div>
                <span>SOURCE FILES</span>
                <strong>{projectState?.sourceFileCount ?? 0}</strong>
              </div>
              <div>
                <span>SOURCE SIZE</span>
                <strong>{formatBytes(projectState?.sourceBytes ?? 0)}</strong>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Code2 aria-hidden="true" className="size-4" />
                Source mix
              </div>
              <div className="grid gap-2">
                {projectState?.languageStats.length ? projectState.languageStats.map((stat) => (
                  <div key={stat.language} className="grid gap-1">
                    <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                      <span>{stat.language}</span>
                      <span>{stat.percentage}% · {formatBytes(stat.bytes)}</span>
                    </div>
                    <div className="h-2 border-[2px] border-[var(--border)] bg-[var(--surface)]">
                      <div className="h-full bg-[var(--arcade-cyan)]" style={{ width: `${stat.percentage}%` }} />
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-[var(--muted-foreground)]">감지된 소스코드가 없습니다.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <FileText aria-hidden="true" className="size-4" />
                업데이트 요청
              </label>
              <RichPromptEditor label="Update request" value={updateContent} onChange={setUpdateContent} placeholder="변경하거나 보완할 내용을 입력하세요." />
            </div>

            {projectState?.updateEnabled ? null : (
              <p className="architect-error">{disabledReason}</p>
            )}
            {mutation.isError ? (
              <p className="architect-error">{mutation.error instanceof Error ? mutation.error.message : "UPDATE를 시작하지 못했습니다."}</p>
            ) : null}

            <Button className="self-start" disabled={disabled} onClick={() => mutation.mutate()}>
              <GitBranch aria-hidden="true" className="size-4" />
              {mutation.isPending ? "실행 중..." : "Update 실행"}
            </Button>
          </Card>
        </div>
        <LogViewer job={updateJob} />
      </div>
    </div>
  );
}
