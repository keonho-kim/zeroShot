import { FileCode2, Play } from "lucide-react";
import { projectName } from "@/entities/project/project-name";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import type { ProjectState } from "@/types/api";

export function BuildSetupCard({
  disabled,
  isError,
  isPending,
  error,
  onStart,
  projectRoot,
  projectState
}: {
  disabled: boolean;
  isError: boolean;
  isPending: boolean;
  error: unknown;
  onStart: () => void;
  projectRoot: string;
  projectState: ProjectState | undefined;
}) {
  const { t } = useI18n();
  return (
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
      {projectState?.buildEnabled ? null : <p className="architect-error">{t("build.disabled")}</p>}
      {isError ? <p className="architect-error">{error instanceof Error ? error.message : t("build.disabled")}</p> : null}
      <div className="build-setup-actions">
        <Button disabled={disabled} onClick={onStart}>
          <Play aria-hidden="true" className="size-4" />
          {isPending ? t("build.starting") : t("build.startTitle")}
        </Button>
      </div>
    </Card>
  );
}
