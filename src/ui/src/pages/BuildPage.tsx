import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, FileCode2, Play } from "lucide-react";
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { fetchProjectState, startBuild } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { LogViewer } from "@/components/LogViewer";

function projectName(projectRoot: string): string {
  return projectRoot.split("/").filter(Boolean).at(-1) || projectRoot;
}

export function BuildPage() {
  const { t, responseLanguage } = useI18n();
  const projectRoot = useAppStore((state) => state.projectRoot);
  const setProjectState = useAppStore((state) => state.setProjectState);
  const currentJob = useAppStore((state) => state.currentJob);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
  const clearLogs = useAppStore((state) => state.clearLogs);

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
                <p className="agent-panel-kicker">{t("build.agent")}</p>
                <h2>{buildJob?.status === "completed" ? t("build.completed") : buildJob?.status === "failed" ? t("build.failed") : t("build.running")}</h2>
                <p>{t("build.runningDetail")}</p>
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
              <p className="agent-panel-kicker">{t("build.pipeline")}</p>
              <h2>{t("build.startTitle")}</h2>
              <p>{t("build.startDescription")}</p>
            </div>
          </div>

          <div className="agent-status-grid">
            <div>
              <span>{t("common.project")}</span>
              <strong title={projectRoot}>{projectName(projectRoot)}</strong>
            </div>
            <div>
              <span>{t("common.product")}</span>
              <strong>{projectState?.hasProductHtml ? t("common.ready") : t("common.missing")}</strong>
            </div>
            <div>
              <span>{t("common.design")}</span>
              <strong>{projectState?.hasDesign ? t("common.ready") : t("common.optional")}</strong>
            </div>
            <div>
              <span>{t("common.goal")}</span>
              <strong>{t("build.testSpec")}</strong>
            </div>
          </div>

          {projectState?.buildEnabled ? null : (
            <p className="architect-error">{t("build.disabled")}</p>
          )}
          {mutation.isError ? (
            <p className="architect-error">{mutation.error instanceof Error ? mutation.error.message : t("build.disabled")}</p>
          ) : null}

          <div className="build-setup-actions">
            <Button disabled={disabled} onClick={() => mutation.mutate()}>
              <Play aria-hidden="true" className="size-4" />
              {mutation.isPending ? t("build.starting") : t("build.startTitle")}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
