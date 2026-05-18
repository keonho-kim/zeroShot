import { useEffect, useMemo } from "react";
import type { JobSnapshot } from "@/types/api";
import { useAppStore, type LogLine } from "@/stores/app-store";
import { Card } from "@/components/ui/card";
import { AgentLoadingStage } from "@/components/AgentLoadingStage";
import { CodexLoadingLog } from "@/components/CodexLoadingLog";
import { RunArtifactsPreview } from "@/components/RunArtifactsPreview";
import { useI18n } from "@/lib/i18n";

interface Props {
  job: JobSnapshot | null;
}

const phaseTitleKeys: Record<string, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  build: "log.pipelineSetup",
  prepare: "log.prepare",
  env: "log.environment",
  run: "log.session",
  schema: "log.schema",
  codex: "log.codex",
  iter: "log.implement",
  replan: "log.replan",
  validate: "log.validate",
  "sync-product": "log.syncProduct",
  closeout: "log.closeout"
};

function phaseFromLine(line: LogLine): string {
  if (line.type === "job_started" || line.type === "job_finished" || line.type === "job_failed") {
    return line.type;
  }
  const match = /^\[(?<phase>[^\]]+)\]/.exec(line.text);
  return match?.groups?.phase ?? line.type;
}

function titleForPhase(phase: string, job: JobSnapshot | null, t: ReturnType<typeof useI18n>["t"]): string {
  if (phase === "job_started") {
    return job?.mode === "update" ? t("log.updateStarted") : t("log.buildStarted");
  }
  if (phase === "job_finished") {
    return job?.mode === "update" ? t("log.updateCompleted") : t("log.buildCompleted");
  }
  if (phase === "job_failed") {
    return job?.mode === "update" ? t("log.updateFailed") : t("log.buildFailed");
  }
  const key = phaseTitleKeys[phase];
  return key ? t(key) : phase;
}

function lineDetail(line: LogLine): string {
  return line.text.replace(/^\[[^\]]+\]\s*/, "").trim();
}

function toProgressItems(job: JobSnapshot | null, logs: LogLine[], t: ReturnType<typeof useI18n>["t"]) {
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
      title: titleForPhase(phase, job, t),
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
  const { t } = useI18n();
  const logs = useAppStore((state) => state.logs);
  const appendLog = useAppStore((state) => state.appendLog);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
  const visibleLogs = job ? logs : [];
  const progressItems = useMemo(() => toProgressItems(job, visibleLogs, t), [job, t, visibleLogs]);
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
        <AgentLoadingStage label={job?.mode === "update" ? t("log.updating") : t("log.building")} />
        <div>
          <p className="text-sm font-semibold">{t("log.streamTitle")}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{t("log.streamDetail")}</p>
        </div>
        <CodexLoadingLog
          progressItems={progressItems}
          messages={messages}
          emptyMessage={job ? t("log.waiting") : t("log.notStarted")}
        />
      </Card>
      <RunArtifactsPreview job={job} />
    </div>
  );
}
