import { useEffect, useMemo } from "react";
import type { JobSnapshot } from "@/types/api";
import { useAppStore, type LogLine } from "@/stores/app-store";
import { Card } from "@/components/ui/card";
import { AgentLoadingStage } from "@/components/AgentLoadingStage";
import { CodexLoadingLog } from "@/components/CodexLoadingLog";
import { RunArtifactsPreview } from "@/components/RunArtifactsPreview";

interface Props {
  job: JobSnapshot | null;
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

function phaseFromLine(line: LogLine): string {
  if (line.type === "job_started" || line.type === "job_finished" || line.type === "job_failed") {
    return line.type;
  }
  const match = /^\[(?<phase>[^\]]+)\]/.exec(line.text);
  return match?.groups?.phase ?? line.type;
}

function titleForPhase(phase: string, job: JobSnapshot | null): string {
  const label = job?.mode === "update" ? "Update" : "Build";
  if (phase === "job_started") {
    return `${label} session started`;
  }
  if (phase === "job_finished") {
    return `${label} session completed`;
  }
  if (phase === "job_failed") {
    return `${label} session failed`;
  }
  return phaseTitles[phase] ?? phase;
}

function lineDetail(line: LogLine): string {
  return line.text.replace(/^\[[^\]]+\]\s*/, "").trim();
}

function toProgressItems(job: JobSnapshot | null, logs: LogLine[]) {
  const grouped = new Map<string, LogLine[]>();
  for (const line of logs) {
    const phase = phaseFromLine(line);
    grouped.set(phase, [...(grouped.get(phase) ?? []), line]);
  }

  return Array.from(grouped.entries()).map(([phase, lines], index, entries) => {
    const failed = lines.some((line) => line.type === "stderr" || line.type === "job_failed" || /\bFAIL\b|failed/i.test(line.text));
    const isLast = index === entries.length - 1;
    const status: "running" | "completed" | "failed" = failed
      ? "failed"
      : job?.status === "running" && isLast
        ? "running"
        : "completed";

    return {
      id: phase,
      title: titleForPhase(phase, job),
      detail: lineDetail(lines.at(-1) ?? { type: "stdout", text: "" }),
      status
    };
  });
}

function toMessages(logs: LogLine[]): string[] {
  return logs
    .filter((line) => line.type === "stdout" || line.type === "stderr")
    .map(lineDetail)
    .filter(Boolean)
    .slice(-10);
}

export function LogViewer({ job }: Props) {
  const logs = useAppStore((state) => state.logs);
  const appendLog = useAppStore((state) => state.appendLog);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
  const visibleLogs = job ? logs : [];
  const progressItems = useMemo(() => toProgressItems(job, visibleLogs), [job, visibleLogs]);
  const messages = useMemo(() => toMessages(visibleLogs), [visibleLogs]);

  useEffect(() => {
    if (!job || job.status !== "running") {
      return;
    }

    const stream = new EventSource(`/api/jobs/${job.id}/stream`);
    const bind = (type: string) => (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as Record<string, unknown>;
      appendLog({
        type: type as never,
        text: String(data.line ?? data.phase ?? data.status ?? data.message ?? "")
      });
      if (type === "job_finished" || type === "job_failed") {
        setCurrentJob({
          ...job,
          status: type === "job_finished" ? "completed" : "failed",
          exitCode: typeof data.exitCode === "number" ? data.exitCode : 1,
          finishedAt: new Date().toISOString()
        });
      }
    };

    stream.addEventListener("stdout", bind("stdout"));
    stream.addEventListener("stderr", bind("stderr"));
    stream.addEventListener("phase", bind("phase"));
    stream.addEventListener("job_started", bind("job_started"));
    stream.addEventListener("job_finished", bind("job_finished"));
    stream.addEventListener("job_failed", bind("job_failed"));

    return () => stream.close();
  }, [appendLog, job, setCurrentJob]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 bg-[var(--panel)]">
        <AgentLoadingStage label={job?.mode === "update" ? "UPDATING" : "BUILDING"} />
        <div>
          <p className="text-sm font-semibold">Codex work stream</p>
          <p className="text-xs text-[var(--muted-foreground)]">실행 단계와 작업 로그를 한 흐름으로 표시합니다.</p>
        </div>
        <CodexLoadingLog
          progressItems={progressItems}
          messages={messages}
          emptyMessage={job ? "작업 로그를 기다리고 있습니다." : "START 버튼을 누르면 작업 내역이 여기에 표시됩니다."}
        />
      </Card>
      <RunArtifactsPreview job={job} />
    </div>
  );
}
