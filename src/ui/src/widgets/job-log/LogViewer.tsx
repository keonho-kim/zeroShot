import { useEffect, useMemo } from "react";
import type { JobSnapshot } from "@/types/api";
import { useAppStore, type LogLine } from "@/store/app-store";
import { Card } from "@/shared/ui/card";
import { CodexLoadingPanel } from "@/widgets/codex-loading/CodexLoadingPanel";
import { RunArtifactsPreview } from "@/widgets/job-log/RunArtifactsPreview";
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

function compact(value: string, maxLength = 160): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function readableCodexLine(value: string): string {
  const detail = value.replace(/^\[codex\]\s*/, "").trim();
  const webSearch = /^(?:item updated|item completed): web_search\s+(?<query>.+)$/.exec(detail);
  if (webSearch?.groups?.query) {
    return `검색 중: ${compact(webSearch.groups.query)}`;
  }
  const tool = /^(?:item updated|item completed): mcp\s+(?<tool>\S+)(?:\s+(?<status>\S+))?/.exec(detail);
  if (tool?.groups?.tool) {
    return `도구 호출: ${compact([tool.groups.tool, tool.groups.status].filter(Boolean).join(" · "))}`;
  }
  const command = /^(?:item updated|item completed): command\s+(?<status>\S+)\s+(?<command>.+)$/.exec(detail);
  if (command?.groups?.command) {
    return `명령 실행: ${compact([command.groups.status, command.groups.command].filter(Boolean).join(" · "))}`;
  }
  const fileChange = /^(?:item updated|item completed): file_change\s+(?<status>\S+)\s+(?<changes>.+)$/.exec(detail);
  if (fileChange?.groups?.changes) {
    return `파일 변경: ${compact([fileChange.groups.status, fileChange.groups.changes].filter(Boolean).join(" · "))}`;
  }
  if (/^(?:item updated|item completed): agent_message$/.test(detail)) {
    return "Codex 응답: 최종 보고와 다음 작업 상태를 작성하고 있습니다.";
  }
  return `작업 로그: ${compact(detail)}`;
}

function latestUnique(items: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (let index = items.length - 1; index >= 0 && result.length < limit; index -= 1) {
    const item = items[index];
    if (seen.has(item)) {
      continue;
    }
    seen.add(item);
    result.unshift(item);
  }
  return result;
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
  const messages = logs
    .filter((line) => line.type === "stdout" || line.type === "stderr")
    .map((line) => readableCodexLine(lineDetail(line)))
    .filter(Boolean)
    .filter((line, index, items) => items[index - 1] !== line);
  return latestUnique(messages, 20);
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
        <CodexLoadingPanel
          label={job?.mode === "update" ? t("log.updating") : t("log.building")}
          noteTitle={t("log.streamTitle")}
          noteDetail={t("log.streamDetail")}
          progressItems={progressItems}
          messages={messages}
          emptyMessage={job ? t("log.waiting") : t("log.notStarted")}
        />
      </Card>
      <RunArtifactsPreview job={job} />
    </div>
  );
}
