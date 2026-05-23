import { Bot, CheckCircle2, Circle, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { CodexLoadingPanel } from "@/components/CodexLoadingPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { requestOmakaseStream } from "@/lib/api/omakase";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";
import { useBodyClass } from "@/hooks/useBodyClass";
import type { JobEvent, OmakaseStage, OmakaseStagePayload } from "@/types/api";

type OmakaseRunStatus = "idle" | "running" | "completed" | "failed";
type StageStatus = "idle" | "running" | "completed" | "failed";

interface OmakaseProgressItem {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
}

const stageOrder: OmakaseStage[] = ["architect", "design", "build"];
const initialStageStatuses: Record<OmakaseStage, StageStatus> = {
  architect: "idle",
  design: "idle",
  build: "idle"
};

function stageLabel(stage: OmakaseStage): string {
  return stage === "architect" ? "ARCHITECT" : stage === "design" ? "DESIGN" : "BUILD";
}

function projectName(projectRoot: string): string {
  return projectRoot.split("/").filter(Boolean).at(-1) || projectRoot;
}

function buildLogText(event: JobEvent): string {
  if (typeof event.data.line === "string") {
    return event.data.line;
  }
  if (typeof event.data.phase === "string") {
    return event.data.phase;
  }
  if (typeof event.data.status === "string") {
    return event.data.status;
  }
  if (typeof event.data.message === "string") {
    return event.data.message;
  }
  return event.type;
}

function OmakaseTimeline({ statuses }: { statuses: Record<OmakaseStage, StageStatus> }) {
  return (
    <div className="omakase-timeline" aria-label="Omakase progress">
      {stageOrder.map((stage) => {
        const status = statuses[stage];
        return (
          <div key={stage} className={`omakase-timeline-item ${status}`}>
            <span className="omakase-timeline-icon">
              {status === "completed" ? <CheckCircle2 aria-hidden="true" /> : status === "running" ? <Play aria-hidden="true" /> : <Circle aria-hidden="true" />}
            </span>
            <strong>{stageLabel(stage)}</strong>
          </div>
        );
      })}
    </div>
  );
}

function OmakaseLogViewer({
  statuses,
  progressItems,
  messages,
  emptyMessage
}: {
  statuses: Record<OmakaseStage, StageStatus>;
  progressItems: OmakaseProgressItem[];
  messages: string[];
  emptyMessage: string;
}) {
  return (
    <Card className="omakase-log-panel">
      <OmakaseTimeline statuses={statuses} />
      <CodexLoadingPanel
        label="OMAKASE"
        noteTitle="ARCHITECT -> DESIGN -> BUILD"
        noteDetail="Codex is making the intermediate choices and running the full workflow."
        progressItems={progressItems}
        messages={messages}
        emptyMessage={emptyMessage}
      />
    </Card>
  );
}

export function OmakasePage() {
  const { locale, responseLanguage, t } = useI18n();
  const projectRoot = useAppStore((state) => state.projectRoot);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
  const [brief, setBrief] = useState("");
  const [runStatus, setRunStatus] = useState<OmakaseRunStatus>("idle");
  const [stageStatuses, setStageStatuses] = useState<Record<OmakaseStage, StageStatus>>(initialStageStatuses);
  const [progressItems, setProgressItems] = useState<OmakaseProgressItem[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState("");

  useBodyClass("home-page");

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  const updateStageStatus = (stage: OmakaseStage, status: StageStatus) => {
    setStageStatuses((current) => ({ ...current, [stage]: status }));
  };

  const addMessage = (stage: OmakaseStage, message: string) => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }
    setMessages((items) => {
      const next = `${stageLabel(stage)}: ${trimmed}`;
      return items.at(-1) === next ? items : [...items, next].slice(-40);
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
      title: stageLabel(payload.stage),
      detail: payload.detail ?? `${stageLabel(payload.stage)} started.`,
      status: "running"
    });
  };

  const handleStageProgress = (payload: OmakaseStagePayload) => {
    if (!payload.event) {
      return;
    }
    upsertProgress({
      id: `${payload.stage}:${payload.event.id}`,
      title: `${stageLabel(payload.stage)} · ${payload.event.title}`,
      detail: payload.event.detail,
      status: payload.event.status
    });
  };

  const handleStageMessage = (payload: OmakaseStagePayload) => {
    addMessage(payload.stage, payload.message ?? "");
  };

  const handleStageCompleted = (payload: OmakaseStagePayload) => {
    updateStageStatus(payload.stage, "completed");
    upsertProgress({
      id: `${payload.stage}:stage`,
      title: stageLabel(payload.stage),
      detail: payload.detail ?? `${stageLabel(payload.stage)} completed.`,
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
      title: stageLabel(payload.stage),
      detail: payload.message ?? `${stageLabel(payload.stage)} failed.`,
      status: "failed"
    });
  };

  const startOmakase = async () => {
    const trimmed = brief.trim();
    if (!trimmed || runStatus === "running") {
      return;
    }

    setRunStatus("running");
    setStageStatuses(initialStageStatuses);
    setProgressItems([]);
    setMessages([]);
    setError("");

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
          onStageMessage: handleStageMessage,
          onStageCompleted: handleStageCompleted,
          onStageFailed: handleStageFailed,
          onBuildLog: ({ event }) => {
            addMessage("build", buildLogText(event));
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
    } catch (caught) {
      setRunStatus("failed");
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const running = runStatus === "running";

  return (
    <div className="home-shell omakase-page mx-auto flex max-w-[1180px] flex-col gap-6 md:gap-8">
      <PageHeader title="OMAKASE" projectRoot={projectRoot} />
      <section className="home-console" aria-label="Omakase project">
        <div className="home-console-topline">
          <span>{t("home.projectSlot")}</span>
          <span>{runStatus === "completed" ? t("common.ready") : running ? t("common.loading") : t("common.wait")}</span>
        </div>
        <div className="min-w-0">
          <p className="home-console-title">{projectName(projectRoot)}</p>
          <p className="home-console-path" title={projectRoot}>
            {projectRoot}
          </p>
        </div>
      </section>

      <Card className="omakase-input-card">
        <div className="agent-panel-heading">
          <div className="agent-panel-icon">
            <Bot aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="agent-panel-kicker">{t("home.omakaseEyebrow")}</p>
            <h2>{t("home.omakasePromptTitle")}</h2>
            <p>{t("home.omakasePromptDescription")}</p>
          </div>
        </div>
        <Textarea
          value={brief}
          disabled={running}
          onChange={(event) => setBrief(event.target.value)}
          placeholder={t("home.omakasePlaceholder")}
        />
        <div className="omakase-actions">
          <Button disabled={!brief.trim() || running} onClick={startOmakase}>
            <Play className="size-4" />
            {running ? t("home.omakaseRunning") : t("home.omakaseRun")}
          </Button>
          {runStatus === "failed" ? (
            <Button variant="outline" onClick={startOmakase}>
              <RotateCcw className="size-4" />
              {t("home.omakaseRetry")}
            </Button>
          ) : null}
        </div>
        {error ? <p className="architect-error">{error}</p> : null}
      </Card>

      <OmakaseLogViewer
        statuses={stageStatuses}
        progressItems={progressItems}
        messages={messages}
        emptyMessage={runStatus === "idle" ? t("home.omakaseNotStarted") : t("log.waiting")}
      />
    </div>
  );
}
