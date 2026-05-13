import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Circle, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LogLine } from "@/stores/app-store";
import type { JobSnapshot } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  job: JobSnapshot | null;
  logs: LogLine[];
}

interface WorkCard {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  summary: string;
  lines: LogLine[];
}

const phaseTitles: Record<string, string> = {
  build: "Pipeline setup",
  prepare: "Prepare run",
  env: "Check environment",
  run: "Create work session",
  schema: "Define output contract",
  codex: "Ask Codex to work",
  iter: "Implement task",
  replan: "Replan work",
  validate: "Validate result",
  "sync-product": "Update product brief",
  closeout: "Write final report"
};

const preferredPhaseOrder = ["build", "prepare", "env", "run", "schema", "codex", "iter", "replan", "validate", "sync-product", "closeout"];

function phaseFromLine(line: LogLine): string {
  if (line.type === "job_started" || line.type === "job_finished" || line.type === "job_failed") {
    return line.type;
  }
  const match = /^\[(?<phase>[^\]]+)\]/.exec(line.text);
  return match?.groups?.phase ?? line.type;
}

function titleForPhase(phase: string): string {
  if (phase === "job_started") {
    return "Start build session";
  }
  if (phase === "job_finished") {
    return "Finish build session";
  }
  if (phase === "job_failed") {
    return "Build stopped";
  }
  return phaseTitles[phase] ?? phase;
}

function buildCards(job: JobSnapshot | null, logs: LogLine[]): WorkCard[] {
  if (!job && logs.length === 0) {
    return [{
      id: "idle",
      title: "No build is running",
      status: "pending",
      summary: "Start from ARCHITECT or BUILD to see work cards here.",
      lines: []
    }];
  }

  const grouped = new Map<string, LogLine[]>();
  for (const line of logs) {
    const phase = phaseFromLine(line);
    grouped.set(phase, [...(grouped.get(phase) ?? []), line]);
  }

  const ordered = [
    ...preferredPhaseOrder.filter((phase) => grouped.has(phase)),
    ...Array.from(grouped.keys()).filter((phase) => !preferredPhaseOrder.includes(phase))
  ];

  return ordered.map((phase, index) => {
    const lines = grouped.get(phase) ?? [];
    const latest = lines.at(-1)?.text.replace(/^\[[^\]]+\]\s*/, "") ?? "Waiting for work to start.";
    const failed = lines.some((line) => line.type === "stderr" || line.type === "job_failed" || /\bFAIL\b|failed/i.test(line.text));
    const isLast = index === ordered.length - 1;
    const status = failed
      ? "failed"
      : job?.status === "running" && isLast
        ? "running"
        : "completed";

    return {
      id: phase,
      title: titleForPhase(phase),
      status,
      summary: latest,
      lines
    };
  });
}

function StatusMark({ status }: { status: WorkCard["status"] }) {
  if (status === "completed") {
    return <CheckCircle2 className="size-5 text-[var(--success)]" />;
  }
  if (status === "failed") {
    return <AlertCircle className="size-5 text-[var(--danger)]" />;
  }
  if (status === "running") {
    return <Loader2 className="size-5 animate-spin text-[var(--primary)]" />;
  }
  return <Circle className="size-5 text-[var(--text-subtle)]" />;
}

export function BuildFlashcards({ job, logs }: Props) {
  const navigate = useNavigate();
  const cards = useMemo(() => buildCards(job, logs), [job, logs]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const activeCard = cards[Math.min(activeIndex, cards.length - 1)];
  const completed = job?.status === "completed";

  useEffect(() => {
    if (job?.status === "running") {
      setActiveIndex(Math.max(0, cards.length - 1));
    }
  }, [cards.length, job?.status]);

  useEffect(() => {
    if (completed) {
      setCompletionModalOpen(true);
    }
  }, [completed]);

  return (
    <div className="flashcard-stage">
      <div className="flashcard-progress">
        <span>{Math.min(activeIndex + 1, cards.length)} / {cards.length}</span>
        <div>
          {cards.map((card, index) => (
            <button
              type="button"
              aria-label={`Open ${card.title}`}
              className={index === activeIndex ? "active" : ""}
              key={card.id}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>
      <Card className="work-flashcard">
        <div className="work-card-heading">
          <span className="work-card-icon"><StatusMark status={activeCard.status} /></span>
          <div>
            <p className="work-card-kicker">{activeCard.status}</p>
            <h2>{activeCard.title}</h2>
          </div>
        </div>
        <p className="work-card-summary">{activeCard.summary}</p>
        <div className="work-card-log">
          {activeCard.lines.length ? activeCard.lines.map((line, index) => (
            <p data-type={line.type} key={`${activeCard.id}-${index}`}>{line.text}</p>
          )) : <p>No logs yet.</p>}
        </div>
        <div className="work-card-actions">
          <Button variant="outline" disabled={activeIndex === 0} onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button variant="outline" disabled={activeIndex >= cards.length - 1} onClick={() => setActiveIndex((index) => Math.min(cards.length - 1, index + 1))}>
            Next
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </Card>
      {completionModalOpen ? (
        <div className="app-modal-backdrop" role="dialog" aria-modal="true" aria-label="Build completed">
          <Card className="app-modal">
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setCompletionModalOpen(false)}>
              <X className="size-4" />
            </button>
            <p className="modal-eyebrow">Build complete</p>
            <h2>Nice, the build finished.</h2>
            <p>You can review the work cards now, or end this session and come back later from Logs.</p>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setCompletionModalOpen(false)}>Review the cards</Button>
              <Button onClick={() => navigate("/home")}>End session</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
