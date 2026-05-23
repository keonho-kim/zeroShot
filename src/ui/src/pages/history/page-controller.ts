import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWorkflowLogBoard, fetchWorkflowLogRecord, fetchWorkLogProjects } from "@/lib/api/history";
import { fetchProjectState } from "@/lib/api/projects";
import { useAppStore } from "@/store/app-store";
import type { WorkflowLogRecordSummary, WorkflowLogSection, WorkflowLogStage } from "@/types/api";

export function useHistoryPageController() {
  const navigate = useNavigate();
  const currentProjectRoot = useAppStore((state) => state.projectRoot);
  const setProjectRoot = useAppStore((state) => state.setProjectRoot);
  const [selectedProjectRoot, setSelectedProjectRoot] = useState(currentProjectRoot);
  const [selectedStage, setSelectedStage] = useState<WorkflowLogStage>("product");
  const [selectedSection, setSelectedSection] = useState<WorkflowLogSection>("blueprint");
  const [selectedRecordId, setSelectedRecordId] = useState("");

  const projectsQuery = useQuery({
    queryKey: ["work-log-projects"],
    queryFn: fetchWorkLogProjects
  });
  const projects = projectsQuery.data ?? [];
  const projectStateQuery = useQuery({
    queryKey: ["project-state", selectedProjectRoot],
    queryFn: () => fetchProjectState(selectedProjectRoot),
    enabled: Boolean(selectedProjectRoot)
  });
  const boardQuery = useQuery({
    queryKey: ["workflow-log-board", selectedProjectRoot],
    queryFn: () => fetchWorkflowLogBoard(selectedProjectRoot),
    enabled: Boolean(selectedProjectRoot)
  });
  const board = boardQuery.data;
  const selectedStageGroup = board?.stages.find((stage) => stage.stage === selectedStage);
  const selectedSectionGroup = selectedStageGroup?.sections.find((section) => section.section === selectedSection);
  const selectedRecords = selectedSectionGroup?.records ?? [];
  const recordQuery = useQuery({
    queryKey: ["workflow-log-record", selectedProjectRoot, selectedRecordId],
    queryFn: () => fetchWorkflowLogRecord(selectedProjectRoot, selectedRecordId),
    enabled: Boolean(selectedProjectRoot && selectedRecordId)
  });

  useEffect(() => {
    if (projectsQuery.isLoading) {
      return;
    }
    if (selectedProjectRoot && projects.some((project) => project.projectRoot === selectedProjectRoot)) {
      return;
    }
    setSelectedProjectRoot(projects[0]?.projectRoot ?? "");
  }, [projects, projectsQuery.isLoading, selectedProjectRoot]);

  useEffect(() => {
    if (!board) {
      return;
    }
    const currentStage = board.stages.find((stage) => stage.stage === selectedStage && stage.enabled);
    const nextStage = currentStage ?? board.stages.find((stage) => stage.enabled);
    if (!nextStage) {
      setSelectedRecordId("");
      return;
    }
    if (nextStage.stage !== selectedStage) {
      setSelectedStage(nextStage.stage);
      setSelectedSection(nextStage.sections.find((section) => section.enabled)?.section ?? nextStage.sections[0].section);
      setSelectedRecordId("");
      return;
    }
    const currentSection = nextStage.sections.find((section) => section.section === selectedSection && section.enabled);
    const nextSection = currentSection ?? nextStage.sections.find((section) => section.enabled);
    if (!nextSection) {
      setSelectedRecordId("");
      return;
    }
    if (nextSection.section !== selectedSection) {
      setSelectedSection(nextSection.section);
      setSelectedRecordId("");
      return;
    }
    if (!selectedRecordId || !nextSection.records.some((record) => record.id === selectedRecordId)) {
      setSelectedRecordId(nextSection.records[0]?.id ?? "");
    }
  }, [board, selectedRecordId, selectedSection, selectedStage]);

  const sectionRecords = useMemo<WorkflowLogRecordSummary[]>(() => selectedRecords, [selectedRecords]);
  const selectedProject = projects.find((project) => project.projectRoot === selectedProjectRoot);
  const hideRecordList = selectedSection === "blueprint" || selectedSection === "preview";

  const chooseStage = (stage: WorkflowLogStage) => {
    const group = board?.stages.find((item) => item.stage === stage);
    const nextSection = group?.sections.find((section) => section.enabled);
    setSelectedStage(stage);
    setSelectedSection(nextSection?.section ?? group?.sections[0]?.section ?? "decisions");
    setSelectedRecordId(nextSection?.records[0]?.id ?? "");
  };

  const chooseSection = (section: WorkflowLogSection) => {
    const group = selectedStageGroup?.sections.find((item) => item.section === section);
    setSelectedSection(section);
    setSelectedRecordId(group?.records[0]?.id ?? "");
  };

  const startUpdate = () => {
    setProjectRoot(selectedProjectRoot);
    navigate("/update");
  };

  return {
    board,
    chooseSection,
    chooseStage,
    hideRecordList,
    projectState: projectStateQuery.data,
    record: recordQuery.data,
    sectionRecords,
    selectedProject,
    selectedProjectRoot,
    selectedRecordId,
    selectedSection,
    selectedStage,
    selectedStageGroup,
    setSelectedRecordId,
    startUpdate
  };
}
