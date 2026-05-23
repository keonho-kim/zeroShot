import { Clock3, FolderOpen, GitBranch } from "lucide-react";
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
    <div className="history-title-meta">
      <span className="history-title-chip" title={controller.selectedProjectRoot}>
        <FolderOpen aria-hidden="true" />
        <span>{formatProjectPath(controller.selectedProjectRoot)}</span>
      </span>
      {controller.selectedProject?.lastActivityAt ? (
        <span className="history-title-chip" title={formatWorkflowDate(controller.selectedProject.lastActivityAt)}>
          <Clock3 aria-hidden="true" />
          <span>{formatWorkflowDate(controller.selectedProject.lastActivityAt)}</span>
        </span>
      ) : null}
    </div>
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
        <>
          <div className={cn("workflow-history-nav", controller.sectionTabsExpanded && "expanded")}>
            <StageTabs
              expandedStage={controller.expandedStage}
              stages={controller.board?.stages}
              selectedStage={controller.selectedStage}
              onSelect={controller.chooseStage}
            />
            {controller.sectionTabsExpanded ? (
              <SectionTabs
                selectedStageGroup={controller.selectedStageGroup}
                selectedSection={controller.selectedSection}
                onSelect={controller.chooseSection}
              />
            ) : null}
          </div>
          <section className={cn("workflow-clamp-board", controller.hideRecordList && "workflow-clamp-board-direct")}>
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
        </>
      ) : (
        <p className="history-empty">{t("log.chooseProject")}</p>
      )}
    </div>
  );
}
