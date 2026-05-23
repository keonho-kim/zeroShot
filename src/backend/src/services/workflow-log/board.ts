import { stageOrder, stageSections } from "@backend/services/workflow-log/const/stage-sections";
import { artifactRecords } from "@backend/services/workflow-log/artifact-records";
import { storedRecords } from "@backend/services/workflow-log/records";
import type { WorkflowLogBoard, WorkflowLogStageGroup } from "@backend/types/history";

export async function readWorkflowLogBoard(projectRoot: string): Promise<WorkflowLogBoard> {
  const records = [
    ...await artifactRecords(projectRoot),
    ...await storedRecords(projectRoot)
  ];

  const stages: WorkflowLogStageGroup[] = stageOrder.map((stage) => {
    const sections = stageSections[stage].map((section) => {
      const sectionRecords = records
        .filter((record) => record.stage === stage && record.section === section)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return {
        section,
        enabled: sectionRecords.length > 0,
        records: sectionRecords
      };
    });
    return {
      stage,
      enabled: sections.some((section) => section.enabled),
      sections
    };
  });

  return { projectRoot, stages };
}
