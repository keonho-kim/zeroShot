import { useEffect, useMemo } from "react";
import type { JobSnapshot } from "../lib/api";
import { useAppStore } from "../app/store";
import { Card } from "./ui/card";

interface Props {
  job: JobSnapshot | null;
}

export function LogViewer({ job }: Props) {
  const logs = useAppStore((state) => state.logs);
  const appendLog = useAppStore((state) => state.appendLog);

  useEffect(() => {
    if (!job) {
      return;
    }

    const stream = new EventSource(`/api/jobs/${job.id}/stream`);
    const bind = (type: string) => (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as Record<string, unknown>;
      appendLog({
        type: type as never,
        text: String(data.line ?? data.phase ?? data.status ?? data.message ?? "")
      });
    };

    stream.addEventListener("stdout", bind("stdout"));
    stream.addEventListener("stderr", bind("stderr"));
    stream.addEventListener("phase", bind("phase"));
    stream.addEventListener("job_started", bind("job_started"));
    stream.addEventListener("job_finished", bind("job_finished"));
    stream.addEventListener("job_failed", bind("job_failed"));

    return () => stream.close();
  }, [appendLog, job]);

  const rendered = useMemo(() => logs.map((line, index) => `${index + 1}. [${line.type}] ${line.text}`).join("\n"), [logs]);

  return (
    <Card className="space-y-3">
      <div>
        <p className="text-sm font-semibold">실행 로그</p>
        <p className="text-xs text-[var(--muted-foreground)]">Build / Update 작업의 stdout, stderr, phase 이벤트가 실시간 표시됩니다.</p>
      </div>
      <pre className="max-h-[420px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-50">{rendered || "아직 로그가 없습니다."}</pre>
    </Card>
  );
}
