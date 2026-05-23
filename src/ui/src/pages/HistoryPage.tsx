import { useQuery } from "@tanstack/react-query";
import { GitBranch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { DocumentPreview } from "@/components/DocumentPreview";
import { Button } from "@/components/ui/button";
import { fetchWorkflowLogBoard, fetchWorkflowLogRecord, fetchWorkLogProjects } from "@/lib/api/history";
import { fetchProjectState } from "@/lib/api/projects";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/utils/cn";
import type {
  WorkflowLogRecordDetail,
  WorkflowLogRecordSummary,
  WorkflowLogSection,
  WorkflowLogStage
} from "@/types/api";

const stageOrder: WorkflowLogStage[] = ["product", "design", "build", "update"];
const stageLabelKeys: Record<WorkflowLogStage, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  product: "log.stage.product",
  design: "log.stage.design",
  build: "log.stage.build",
  update: "log.stage.update"
};
const sectionLabelKeys: Record<WorkflowLogSection, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  blueprint: "log.section.blueprint",
  preview: "log.section.preview",
  decisions: "log.section.decisions",
  logs: "log.section.logs",
  "build-log": "log.section.buildLog",
  request: "log.section.request",
  "update-log": "log.section.updateLog"
};

function formatProjectPath(path: string): string {
  return path.replace(/^\/Users\/[^/]+/, "~");
}

function formatDate(value?: string): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function projectTitle(projectRoot: string): string {
  return projectRoot.split("/").filter(Boolean).at(-1) || projectRoot;
}

function selectedAnswerLabel(payload: unknown, decisionId: string): string {
  if (!payload || typeof payload !== "object" || !("answers" in payload)) {
    return "";
  }
  const answers = (payload as { answers?: Record<string, string> }).answers ?? {};
  return answers[decisionId] ?? "";
}

function DecisionView({ record }: { record: WorkflowLogRecordDetail }) {
  const payload = record.payload as {
    decisionSet?: {
      decisions?: Array<{
        id: string;
        title: string;
        prompt?: string;
        section?: string;
        options: Array<{ id: string; label: string; detail: string; productRequirement: string }>;
      }>;
    };
    mode?: string;
    goal?: string;
    activeSkillId?: string;
    activeDesignTemplateId?: string;
    activeDesignSystemId?: string;
  } | undefined;
  const decisions = payload?.decisionSet?.decisions ?? [];

  if (!decisions.length) {
    return (
      <div className="workflow-json-panel">
        <pre>{JSON.stringify(record.payload ?? {}, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className="workflow-decision-list">
      {decisions.map((decision) => {
        const answerId = selectedAnswerLabel(record.payload, decision.id);
        const option = decision.options.find((candidate) => candidate.id === answerId) ?? decision.options[0];
        return (
          <article className="workflow-decision-card" key={decision.id}>
            <span>{decision.section}</span>
            <h3>{decision.title}</h3>
            {decision.prompt ? <p>{decision.prompt}</p> : null}
            {option ? (
              <div>
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
                <p>{option.productRequirement}</p>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function RequestView({ record }: { record: WorkflowLogRecordDetail }) {
  const payload = record.payload as { request?: string } | undefined;
  return (
    <div className="workflow-request-panel">
      <pre>{payload?.request ?? record.summary}</pre>
    </div>
  );
}

function EventsView({ record }: { record: WorkflowLogRecordDetail }) {
  const { t } = useI18n();
  return (
    <div className="workflow-event-list">
      {record.events.map((event) => (
        <article className="workflow-event-row" key={event.id}>
          <span>{event.seq}</span>
          <div>
            <strong>{event.type}</strong>
            <p>{event.message || JSON.stringify(event.payload ?? {})}</p>
          </div>
          <time>{formatDate(event.createdAt)}</time>
        </article>
      ))}
      {!record.events.length ? <p className="history-empty">{t("log.noEventLogs")}</p> : null}
    </div>
  );
}

function RecordDetail({ record }: { record: WorkflowLogRecordDetail | undefined }) {
  const { t } = useI18n();
  if (!record) {
    return <div className="history-empty history-detail-empty">{t("log.selectRecord")}</div>;
  }
  if (record.kind === "artifact" && record.content?.trim()) {
    return <DocumentPreview className="history-document-frame" filename={record.summary} content={record.content} />;
  }
  if (record.kind === "decisions" || record.section === "decisions") {
    return <DecisionView record={record} />;
  }
  if (record.kind === "request" || record.section === "request") {
    return <RequestView record={record} />;
  }
  return <EventsView record={record} />;
}

export function HistoryPage() {
  const { t } = useI18n();
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

  const updateDisabled = !projectStateQuery.data?.updateEnabled;
  const headerTitle = selectedProjectRoot ? projectTitle(selectedProjectRoot) : t("log.pageTitle");
  const selectedProject = projects.find((project) => project.projectRoot === selectedProjectRoot);
  const headerMeta = selectedProjectRoot ? (
    <p className="history-title-meta" title={selectedProjectRoot}>
      <span>{t("log.projectPathLabel")} {formatProjectPath(selectedProjectRoot)}</span>
      {selectedProject?.lastActivityAt ? (
        <>
          <span aria-hidden="true">·</span>
          <span>{t("log.lastActivityLabel")} {formatDate(selectedProject.lastActivityAt)}</span>
        </>
      ) : null}
    </p>
  ) : undefined;
  const selectedRecord = recordQuery.data;
  const sectionRecords = useMemo<WorkflowLogRecordSummary[]>(() => selectedRecords, [selectedRecords]);
  const hideRecordList = selectedSection === "blueprint" || selectedSection === "preview";

  return (
    <div className="builder-shell history-page">
      <PageHeader
        title={headerTitle}
        titleMeta={headerMeta}
        rightSlot={selectedProjectRoot ? (
          <Button
            className="nav-tile history-update-button"
            disabled={updateDisabled}
            onClick={() => {
              setProjectRoot(selectedProjectRoot);
              navigate("/update");
            }}
          >
            <GitBranch aria-hidden="true" />
            <span>UPDATE</span>
          </Button>
        ) : undefined}
      />

      {selectedProjectRoot ? (
        <section className={cn("workflow-clamp-board", hideRecordList && "workflow-clamp-board-direct")} aria-label={t("log.workflowBoard")}>
          <nav className="workflow-stage-rail" aria-label="Workflow stages">
            <div className="workflow-stage-tabs">
              {stageOrder.map((stage) => {
                const group = board?.stages.find((item) => item.stage === stage);
                return (
                  <button
                    type="button"
                    key={stage}
                    className={cn("workflow-stage-tab", selectedStage === stage && "selected")}
                    disabled={!group?.enabled}
                    onClick={() => {
                      const nextSection = group?.sections.find((section) => section.enabled);
                      setSelectedStage(stage);
                      setSelectedSection(nextSection?.section ?? group?.sections[0]?.section ?? "decisions");
                      setSelectedRecordId(nextSection?.records[0]?.id ?? "");
                    }}
                  >
                    <span>{t(stageLabelKeys[stage])}</span>
                    <small>{group?.sections.reduce((count, section) => count + section.records.length, 0) ?? 0}</small>
                  </button>
                );
              })}
            </div>
          </nav>

          <nav className="workflow-section-rail" aria-label="Workflow sections">
            <div className="workflow-section-tabs">
              {selectedStageGroup?.sections.map((section) => (
                <button
                  type="button"
                  key={section.section}
                  className={cn("workflow-section-tab", selectedSection === section.section && "selected")}
                  disabled={!section.enabled}
                  onClick={() => {
                    setSelectedSection(section.section);
                    setSelectedRecordId(section.records[0]?.id ?? "");
                  }}
                >
                  {t(sectionLabelKeys[section.section])}
                </button>
              ))}
            </div>
          </nav>

          {!hideRecordList ? (
            <aside className="workflow-record-list">
              {sectionRecords.map((record) => (
                <button
                  type="button"
                  key={record.id}
                  className={cn("workflow-record-button", selectedRecordId === record.id && "selected")}
                  onClick={() => setSelectedRecordId(record.id)}
                >
                  <strong>{record.title}</strong>
                  <span>{record.summary}</span>
                  <small>{formatDate(record.createdAt)}</small>
                </button>
              ))}
              {!sectionRecords.length ? <p className="history-empty">{t("log.noSectionRecords")}</p> : null}
            </aside>
          ) : null}

          <section className="workflow-record-detail">
            <div className="workflow-record-heading">
              <span>{selectedSection ? t(sectionLabelKeys[selectedSection]) : ""}</span>
              {!hideRecordList ? <strong>{selectedRecord?.title ?? t("log.chooseEntry")}</strong> : null}
            </div>
            <RecordDetail record={selectedRecord} />
          </section>
        </section>
      ) : (
        <p className="history-empty">{t("log.chooseProject")}</p>
      )}
    </div>
  );
}
