import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildLogText, initialOmakaseStageStatuses, omakaseStageLabel, type OmakaseProgressItem, type OmakaseRunStatus, type OmakaseStageStatus } from "@/entities/omakase/omakase-progress";
import { codexProgressPresentation, type CodexLoadingLogSource } from "@/entities/codex/codex-loading-log";
import { useBodyClass } from "@/hooks/useBodyClass";
import { requestOmakaseStream } from "@/lib/api/omakase";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";
import type { JobEvent, OmakaseStage, OmakaseStagePayload } from "@/types/api";

export function useOmakasePageController() {
  const { locale, responseLanguage } = useI18n();
  const navigate = useNavigate();
  const projectRoot = useAppStore((state) => state.projectRoot);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
  const [brief, setBrief] = useState("");
  const [runStatus, setRunStatus] = useState<OmakaseRunStatus>("idle");
  const [stageStatuses, setStageStatuses] = useState<Record<OmakaseStage, OmakaseStageStatus>>(initialOmakaseStageStatuses);
  const [progressItems, setProgressItems] = useState<OmakaseProgressItem[]>([]);
  const [logSources, setLogSources] = useState<CodexLoadingLogSource[]>([]);
  const [error, setError] = useState("");
  const logIdRef = useRef(0);

  useBodyClass("home-page");

  const updateStageStatus = (stage: OmakaseStage, status: OmakaseStageStatus) => {
    setStageStatuses((current) => ({ ...current, [stage]: status }));
  };

  const addMessage = (stage: OmakaseStage, message: string) => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }
    logIdRef.current += 1;
    setLogSources((items) => {
      const next: CodexLoadingLogSource = {
        source: "omakase",
        id: `omakase-${logIdRef.current}`,
        stage,
        message: trimmed
      };
      const previous = items.at(-1);
      return previous?.source === "omakase" && previous.stage === stage && previous.message === trimmed
        ? items
        : [...items, next].slice(-80);
    });
  };

  const addBuildLog = (event: JobEvent) => {
    const text = buildLogText(event).trim();
    if (!text) {
      return;
    }
    logIdRef.current += 1;
    setLogSources((items) => {
      const next: CodexLoadingLogSource = {
        source: "job",
        id: `omakase-build-${logIdRef.current}`,
        lineType: event.type,
        text
      };
      const previous = items.at(-1);
      return previous?.source === "job" && previous.lineType === event.type && previous.text === text
        ? items
        : [...items, next].slice(-80);
    });
  };

  const upsertProgress = (item: OmakaseProgressItem) => {
    setProgressItems((items) => {
      const index = items.findIndex((candidate) => candidate.id === item.id);
      if (index === -1) {
        return [...items, item].slice(-60);
      }
      return items.map((candidate, itemIndex) => itemIndex === index ? item : candidate);
    });
  };

  const handleStageStarted = (payload: OmakaseStagePayload) => {
    updateStageStatus(payload.stage, "running");
    upsertProgress({
      id: `${payload.stage}:stage`,
      title: omakaseStageLabel(payload.stage),
      detail: payload.detail ?? `${omakaseStageLabel(payload.stage)} started.`,
      status: "running"
    });
  };

  const handleStageProgress = (payload: OmakaseStagePayload) => {
    if (!payload.event) {
      return;
    }
    const presentation = codexProgressPresentation(payload.event);
    upsertProgress({
      id: `${payload.stage}:${payload.event.id}`,
      title: `${omakaseStageLabel(payload.stage)} · ${payload.event.title}`,
      detail: payload.event.detail,
      status: payload.event.status,
      ...presentation
    });
  };

  const handleStageCompleted = (payload: OmakaseStagePayload) => {
    updateStageStatus(payload.stage, "completed");
    upsertProgress({
      id: `${payload.stage}:stage`,
      title: omakaseStageLabel(payload.stage),
      detail: payload.detail ?? `${omakaseStageLabel(payload.stage)} completed.`,
      status: "completed"
    });
    if (payload.job) {
      setCurrentJob(payload.job);
    }
  };

  const handleStageFailed = (payload: OmakaseStagePayload) => {
    updateStageStatus(payload.stage, "failed");
    upsertProgress({
      id: `${payload.stage}:stage`,
      title: omakaseStageLabel(payload.stage),
      detail: payload.message ?? `${omakaseStageLabel(payload.stage)} failed.`,
      status: "failed"
    });
  };

  const startOmakase = async () => {
    const trimmed = brief.trim();
    if (!trimmed || runStatus === "running") {
      return;
    }

    setRunStatus("running");
    setStageStatuses(initialOmakaseStageStatuses);
    setProgressItems([]);
    setLogSources([]);
    setError("");
    logIdRef.current = 0;

    try {
      const job = await requestOmakaseStream(
        {
          projectRoot,
          brief: trimmed,
          locale,
          options: { responseLanguage }
        },
        {
          onStageStarted: handleStageStarted,
          onStageProgress: handleStageProgress,
          onStageMessage: (payload) => addMessage(payload.stage, payload.message ?? ""),
          onStageCompleted: handleStageCompleted,
          onStageFailed: handleStageFailed,
          onBuildLog: ({ event }) => {
            addBuildLog(event);
            if (event.type === "job_finished") {
              updateStageStatus("build", "completed");
            }
            if (event.type === "job_failed") {
              updateStageStatus("build", "failed");
            }
          }
        }
      );
      setCurrentJob(job);
      setRunStatus("completed");
      navigate("/history");
    } catch (caught) {
      setRunStatus("failed");
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  return {
    brief,
    error,
    logSources,
    progressItems,
    projectRoot,
    runStatus,
    setBrief,
    stageStatuses,
    startOmakase
  };
}
