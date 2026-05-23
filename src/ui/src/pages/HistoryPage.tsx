import { GitBranch } from "lucide-react";
import { formatProjectPath, formatWorkflowDate, workflowProjectTitle } from "@/entities/workflow-log/format";
import { useI18n } from "@/lib/i18n";
import { useHistoryPageController } from "@/pages/history/page-controller";
import { RecordList } from "@/pages/history/RecordList";
import { RecordDetail } from "@/pages/history/RecordViews";
import { SectionTabs, StageTabs } from "@/pages/history/WorkflowTabs";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/PageHeader";

export function HistoryPage() {
  const { t } = useI18n();
  const controller = useHistoryPageController();
  const headerTitle = controller.selectedProjectRoot ? workflowProjectTitle(controller.selectedProjectRoot) : t("log.pageTitle");
  const updateDisabled = !controller.projectState?.updateEnabled;
  const headerMeta = controller.selectedProjectRoot ? (
    <p className="history-title-meta" title={controller.selectedProjectRoot}>
      <span>{t("log.projectPathLabel")} {formatProjectPath(controller.selectedProjectRoot)}</span>
      {controller.selectedProject?.lastActivityAt ? (
        <>
          <span aria-hidden="true">·</span>
          <span>{t("log.lastActivityLabel")} {formatWorkflowDate(controller.selectedProject.lastActivityAt)}</span>
        </>
      ) : null}
    </p>
  ) : undefined;

  return (
    <div className="builder-shell history-page">
      <PageHeader
        title={headerTitle}
        titleMeta={headerMeta}
        rightSlot={controller.selectedProjectRoot ? (
          <Button
            className="nav-tile history-update-button"
            disabled={updateDisabled}
            onClick={controller.startUpdate}
          >
            <GitBranch aria-hidden="true" />
            <span>UPDATE</span>
          </Button>
        ) : undefined}
      />

      {controller.selectedProjectRoot ? (
        <section className={cn("workflow-clamp-board", controller.hideRecordList && "workflow-clamp-board-direct")} aria-label={t("log.workflowBoard")}>
          <StageTabs
            stages={controller.board?.stages}
            selectedStage={controller.selectedStage}
            onSelect={controller.chooseStage}
          />
          <SectionTabs
            selectedStageGroup={controller.selectedStageGroup}
            selectedSection={controller.selectedSection}
            onSelect={controller.chooseSection}
          />
          {!controller.hideRecordList ? (
            <RecordList
              records={controller.sectionRecords}
              selectedRecordId={controller.selectedRecordId}
              onSelect={controller.setSelectedRecordId}
            />
          ) : null}
          <section className="workflow-record-detail">
            <RecordDetail record={controller.record} />
          </section>
        </section>
      ) : (
        <p className="history-empty">{t("log.chooseProject")}</p>
      )}
    </div>
  );
}
