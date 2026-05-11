import { useEffect } from "react";
import type { JobSnapshot } from "../lib/api";
import { useAppStore } from "../app/store";
import { Card } from "./ui/card";
import { BuildFlashcards } from "./BuildFlashcards";

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

  return (
    <Card className="flex flex-col gap-4 bg-[var(--panel)]">
      <div>
        <p className="text-sm font-semibold">Work cards</p>
        <p className="text-xs text-[var(--muted-foreground)]">작업 단위로 로그를 넘겨보며 진행 상황을 확인합니다.</p>
      </div>
      <BuildFlashcards job={job} logs={logs} />
    </Card>
  );
}
