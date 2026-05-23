import { workflowSectionLabelKeys, workflowStageLabelKeys, workflowStageOrder } from "@/entities/workflow-log/const/labels";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/shared/lib/cn";
import type { WorkflowLogSection, WorkflowLogStage, WorkflowLogStageGroup } from "@/types/api";

export function StageTabs({
  stages,
  selectedStage,
  onSelect
}: {
  stages: WorkflowLogStageGroup[] | undefined;
  selectedStage: WorkflowLogStage;
  onSelect: (stage: WorkflowLogStage) => void;
}) {
  const { t } = useI18n();
  return (
    <nav className="workflow-stage-rail" aria-label="Workflow stages">
      <div className="workflow-stage-tabs">
        {workflowStageOrder.map((stage) => {
          const group = stages?.find((item) => item.stage === stage);
          return (
            <button
              type="button"
              key={stage}
              className={cn("workflow-stage-tab", selectedStage === stage && "selected")}
              disabled={!group?.enabled}
              onClick={() => onSelect(stage)}
            >
              <span>{t(workflowStageLabelKeys[stage])}</span>
              <small>{group?.sections.reduce((count, section) => count + section.records.length, 0) ?? 0}</small>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function SectionTabs({
  selectedStageGroup,
  selectedSection,
  onSelect
}: {
  selectedStageGroup: WorkflowLogStageGroup | undefined;
  selectedSection: WorkflowLogSection;
  onSelect: (section: WorkflowLogSection) => void;
}) {
  const { t } = useI18n();
  return (
    <nav className="workflow-section-rail" aria-label="Workflow sections">
      <div className="workflow-section-tabs">
        {selectedStageGroup?.sections.map((section) => (
          <button
            type="button"
            key={section.section}
            className={cn("workflow-section-tab", selectedSection === section.section && "selected")}
            disabled={!section.enabled}
            onClick={() => onSelect(section.section)}
          >
            {t(workflowSectionLabelKeys[section.section])}
          </button>
        ))}
      </div>
    </nav>
  );
}
