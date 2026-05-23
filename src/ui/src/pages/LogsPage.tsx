import { useQuery } from "@tanstack/react-query";
import { GitBranch, ScrollText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { DocumentPreview, titleFromFilename } from "@/components/DocumentPreview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchProjectState, fetchWorkLogEntries, fetchWorkLogEntryDetail, fetchWorkLogProjects } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/utils/cn";
import type { WorkLogEntrySummary, WorkLogProjectSummary } from "@/types/api";

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

function ProjectButton({
  project,
  selected,
  onClick
}: {
  project: WorkLogProjectSummary;
  selected: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <button type="button" className={cn("logs-list-button", selected && "logs-list-button-active")} onClick={onClick}>
      <span className="logs-list-button-top">
        <strong>{project.name}</strong>
        <small>{t("log.conversationCount", { count: project.conversationsCount })}</small>
      </span>
      <span className="logs-list-button-path">{formatProjectPath(project.projectRoot)}</span>
      {project.lastActivityAt ? <span className="logs-list-button-date">{formatDate(project.lastActivityAt)}</span> : null}
    </button>
  );
}

function EntryButton({
  entry,
  selected,
  onClick
}: {
  entry: WorkLogEntrySummary;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={cn("logs-entry-button", selected && "logs-entry-button-active")} onClick={onClick}>
      <span className="logs-entry-label">{entry.label}</span>
      <span className="logs-entry-copy">
        <strong>{entry.title}</strong>
        <small>{entry.summary}</small>
      </span>
      {entry.createdAt ? <span className="logs-entry-date">{formatDate(entry.createdAt)}</span> : null}
    </button>
  );
}

export function LogsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const currentProjectRoot = useAppStore((state) => state.projectRoot);
  const setProjectRoot = useAppStore((state) => state.setProjectRoot);
  const [selectedProjectRoot, setSelectedProjectRoot] = useState(currentProjectRoot);
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [selectedDoc, setSelectedDoc] = useState("");
  const [selectedMode, setSelectedMode] = useState<"hub" | "log">("hub");

  const projectsQuery = useQuery({
    queryKey: ["work-log-projects"],
    queryFn: fetchWorkLogProjects
  });
  const projects = projectsQuery.data ?? [];
  const selectedProject = projects.find((project) => project.projectRoot === selectedProjectRoot) ?? null;
  const projectStateQuery = useQuery({
    queryKey: ["project-state", selectedProjectRoot],
    queryFn: () => fetchProjectState(selectedProjectRoot),
    enabled: Boolean(selectedProjectRoot)
  });

  useEffect(() => {
    if (selectedProjectRoot && projects.some((project) => project.projectRoot === selectedProjectRoot)) {
      return;
    }
    setSelectedProjectRoot(projects[0]?.projectRoot ?? "");
  }, [projects, selectedProjectRoot]);

  const entriesQuery = useQuery({
    queryKey: ["work-log-entries", selectedProjectRoot],
    queryFn: () => fetchWorkLogEntries(selectedProjectRoot),
    enabled: Boolean(selectedProjectRoot && selectedMode === "log")
  });
  const entries = entriesQuery.data ?? [];

  useEffect(() => {
    if (selectedEntryId && entries.some((entry) => entry.id === selectedEntryId)) {
      return;
    }
    setSelectedEntryId(entries[0]?.id ?? "");
  }, [entries, selectedEntryId]);

  const detailQuery = useQuery({
    queryKey: ["work-log-entry-detail", selectedProjectRoot, selectedEntryId],
    queryFn: () => fetchWorkLogEntryDetail(selectedProjectRoot, selectedEntryId),
    enabled: Boolean(selectedProjectRoot && selectedEntryId && selectedMode === "log")
  });

  const documents = detailQuery.data?.documents ?? {};
  const documentNames = useMemo(
    () => Object.keys(documents).filter((doc) => documents[doc]?.trim()),
    [documents]
  );
  const activeDoc = selectedDoc && documents[selectedDoc] ? selectedDoc : documentNames[0] ?? "";

  useEffect(() => {
    if (!documentNames.length) {
      setSelectedDoc("");
      return;
    }
    if (!selectedDoc || !documents[selectedDoc]) {
      setSelectedDoc(documentNames[0]);
    }
  }, [documentNames, documents, selectedDoc]);

  const selectedProjectState = projectStateQuery.data;
  const updateDisabled = !selectedProjectState?.updateEnabled;
  const updateReason = !selectedProjectState
    ? t("common.loading")
    : selectedProjectState.runsCount < 1
      ? t("update.needsBuild")
      : t("update.noSourceToUpdate");

  return (
    <div className="builder-shell logs-page">
      <PageHeader title="LOGS" projectRoot={selectedProjectRoot || currentProjectRoot} />
      <div className={cn("logs-grid", selectedMode === "hub" && "logs-grid-hub")}>
        <Card className="logs-panel">
          <div className="logs-panel-header">
            <span>{t("log.projectList")}</span>
            <strong>{projects.length}</strong>
          </div>
          <div className="logs-list">
            {projects.map((project) => (
              <ProjectButton
                key={project.projectRoot}
                project={project}
                selected={selectedProjectRoot === project.projectRoot}
                onClick={() => {
                  setSelectedProjectRoot(project.projectRoot);
                  setProjectRoot(project.projectRoot);
                  setSelectedMode("hub");
                  setSelectedEntryId("");
                  setSelectedDoc("");
                }}
              />
            ))}
            {!projectsQuery.isLoading && !projects.length ? <p className="logs-empty">{t("log.noProjects")}</p> : null}
          </div>
        </Card>

        {selectedMode === "hub" ? (
          <Card className="logs-panel logs-mode-panel">
            <div className="logs-panel-header">
              <span>{selectedProject?.name ?? t("log.chooseProject")}</span>
              <strong>{selectedProject ? t("common.select") : "WAIT"}</strong>
            </div>
            {selectedProject ? (
              <div className="logs-mode-actions">
                <button
                  type="button"
                  className="action-card action-card-cyan text-left"
                  disabled={updateDisabled}
                  onClick={() => {
                    setProjectRoot(selectedProject.projectRoot);
                    navigate("/update");
                  }}
                >
                  <div className="action-card-icon">
                    <GitBranch aria-hidden="true" />
                  </div>
                  <p className="action-card-eyebrow">{t("home.afterBuild")}</p>
                  <p className="action-card-title">UPDATE</p>
                  <p className="action-card-description">{updateDisabled ? updateReason : t("home.updateReady")}</p>
                </button>
                <button type="button" className="action-card action-card-mint text-left" onClick={() => setSelectedMode("log")}>
                  <div className="action-card-icon">
                    <ScrollText aria-hidden="true" />
                  </div>
                  <p className="action-card-eyebrow">{t("home.logsArchive")}</p>
                  <p className="action-card-title">LOG</p>
                  <p className="action-card-description">{t("home.logsReady")}</p>
                </button>
              </div>
            ) : <p className="logs-empty">{t("log.chooseProject")}</p>}
          </Card>
        ) : (
          <>
            <Card className="logs-panel">
              <div className="logs-panel-header">
                <span>{t("log.entryList")}</span>
                <strong>{entries.length}</strong>
              </div>
              <div className="logs-list">
                {selectedProject ? entries.map((entry) => (
                  <EntryButton
                    key={entry.id}
                    entry={entry}
                    selected={selectedEntryId === entry.id}
                    onClick={() => {
                      setSelectedEntryId(entry.id);
                      setSelectedDoc("");
                    }}
                  />
                )) : <p className="logs-empty">{t("log.chooseProject")}</p>}
                {selectedProject && !entriesQuery.isLoading && !entries.length ? <p className="logs-empty">{t("log.noRuns")}</p> : null}
              </div>
            </Card>

            <Card className="logs-panel logs-detail-panel">
              <div className="logs-panel-header">
                <span>{t("log.detail")}</span>
                <strong>{detailQuery.data?.summary.label ?? "WAIT"}</strong>
              </div>
              {detailQuery.data ? (
                <div className="logs-detail-summary">
                  <span className="logs-entry-label">{detailQuery.data.summary.label}</span>
                  <div>
                    <h2>{detailQuery.data.summary.title}</h2>
                    <p>{detailQuery.data.summary.summary}</p>
                  </div>
                </div>
              ) : null}
              {documentNames.length ? (
                <>
                  <div className="logs-doc-tabs">
                    {documentNames.map((doc) => (
                      <Button key={doc} variant={activeDoc === doc ? "default" : "outline"} onClick={() => setSelectedDoc(doc)}>
                        {titleFromFilename(doc)}
                      </Button>
                    ))}
                  </div>
                  <DocumentPreview
                    className="logs-document-frame"
                    filename={activeDoc}
                    content={documents[activeDoc] ?? ""}
                  />
                </>
              ) : (
                <div className="logs-empty logs-detail-empty">
                  {selectedEntryId ? t("runArtifacts.loading") : t("log.chooseEntry")}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
