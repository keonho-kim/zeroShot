import { Code2, FileText, Layers3, Terminal } from "lucide-react";
import { formatSourceBytes, updateProjectName } from "@/entities/update/update-decisions";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CodexLoadingPanel } from "@/widgets/codex-loading/CodexLoadingPanel";
import { RichPromptEditor } from "@/features/prompt-editor/RichPromptEditor";
import type { ProjectState, UpdateProgressEvent } from "@/types/api";

export function RequestPanel({
  decisionError,
  disabledReason,
  isGeneratingDecisions,
  onRequestDecisions,
  progressItems,
  projectRoot,
  projectState,
  setUpdateContent,
  streamMessages,
  updateContent,
  updateDisabled
}: {
  decisionError: string;
  disabledReason: string;
  isGeneratingDecisions: boolean;
  onRequestDecisions: () => void;
  progressItems: UpdateProgressEvent[];
  projectRoot: string;
  projectState: ProjectState | undefined;
  setUpdateContent: (value: string) => void;
  streamMessages: string[];
  updateContent: string;
  updateDisabled: boolean;
}) {
  const { t } = useI18n();
  return (
    <Card className="agent-panel flex flex-col gap-4 bg-[var(--panel)]">
      <div className="agent-panel-heading">
        <div className="agent-panel-icon">
          <Terminal aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="agent-panel-kicker">{t("update.requestKicker")}</p>
          <p className="text-lg font-semibold">{t("update.requestTitle")}</p>
          <p className="text-sm text-[var(--muted-foreground)]">{t("update.requestDescription")}</p>
        </div>
      </div>
      <div className="agent-status-grid">
        <div>
          <span>{t("common.project")}</span>
          <strong title={projectRoot}>{updateProjectName(projectRoot)}</strong>
        </div>
        <div>
          <span>{t("update.latestRun")}</span>
          <strong>{projectState?.latestRunName ?? t("common.none")}</strong>
        </div>
        <div>
          <span>{t("update.sourceFiles")}</span>
          <strong>{projectState?.sourceFileCount ?? 0}</strong>
        </div>
        <div>
          <span>{t("update.sourceSize")}</span>
          <strong>{formatSourceBytes(projectState?.sourceBytes ?? 0)}</strong>
        </div>
      </div>
      <div className="grid gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Code2 aria-hidden="true" className="size-4" />
          {t("update.sourceMix")}
        </div>
        <div className="grid gap-2">
          {projectState?.languageStats.length ? projectState.languageStats.map((stat) => (
            <div key={stat.language} className="grid gap-1">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                <span>{stat.language}</span>
                <span>{stat.percentage}% · {formatSourceBytes(stat.bytes)}</span>
              </div>
              <div className="h-2 border-[2px] border-[var(--border)] bg-[var(--surface)]">
                <div className="h-full bg-[var(--arcade-cyan)]" style={{ width: `${stat.percentage}%` }} />
              </div>
            </div>
          )) : (
            <p className="text-sm text-[var(--muted-foreground)]">{t("update.noSource")}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <FileText aria-hidden="true" className="size-4" />
          {t("update.requestLabel")}
        </label>
        <RichPromptEditor label={t("update.requestLabel")} value={updateContent} onChange={setUpdateContent} placeholder={t("update.requestPlaceholder")} />
      </div>
      {projectState?.updateEnabled ? null : <p className="architect-error">{disabledReason}</p>}
      {decisionError ? <p className="architect-error">{decisionError}</p> : null}
      {isGeneratingDecisions ? (
        <div className="makeover-loading-card">
          <CodexLoadingPanel
            label={t("update.questionsLoadingLabel")}
            progressItems={progressItems}
            messages={streamMessages}
            emptyMessage={t("update.organizingQuestions")}
          />
        </div>
      ) : null}
      <Button className="self-start" disabled={updateDisabled} onClick={onRequestDecisions}>
        <Layers3 aria-hidden="true" className="size-4" />
        {isGeneratingDecisions ? t("update.generatingQuestions") : t("update.generateQuestions")}
      </Button>
    </Card>
  );
}
