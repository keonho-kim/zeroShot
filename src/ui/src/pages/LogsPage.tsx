import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAppStore } from "@/stores/app-store";
import { fetchRunDetail, fetchRuns } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";

export function LogsPage() {
  const projectRoot = useAppStore((state) => state.projectRoot);
  const [selectedRun, setSelectedRun] = useState<string>("");
  const [selectedDoc, setSelectedDoc] = useState<string>("work-log.html");

  const runsQuery = useQuery({
    queryKey: ["logs-runs", projectRoot],
    queryFn: () => fetchRuns(projectRoot),
    enabled: Boolean(projectRoot)
  });
  const detailQuery = useQuery({
    queryKey: ["logs-run-detail", projectRoot, selectedRun],
    queryFn: () => fetchRunDetail(projectRoot, selectedRun),
    enabled: Boolean(projectRoot && selectedRun)
  });

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="LOGS" projectRoot={projectRoot} />
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="flex flex-col gap-3 bg-[var(--panel)]">
          <p className="text-lg font-semibold">Run List</p>
          <div className="grid gap-2">
            {runsQuery.data?.map((run) => (
              <Button key={run.name} variant={selectedRun === run.name ? "default" : "outline"} onClick={() => setSelectedRun(run.name)}>
                {run.name}
              </Button>
            ))}
            {!runsQuery.data?.length ? <p className="text-sm text-[var(--muted-foreground)]">표시할 run이 없습니다.</p> : null}
          </div>
        </Card>
        <Card className="flex flex-col gap-4 bg-[var(--panel)]">
          <div className="flex flex-wrap gap-2">
            {Object.keys(detailQuery.data?.documents ?? {}).filter((doc) => detailQuery.data?.documents[doc]).map((doc) => (
              <Button key={doc} variant={selectedDoc === doc ? "default" : "outline"} onClick={() => setSelectedDoc(doc)}>
                {doc}
              </Button>
            ))}
          </div>
          {detailQuery.data?.documents[selectedDoc] ? (
            <iframe
              className="min-h-[640px] w-full rounded-md border border-[var(--border)] bg-white"
              sandbox=""
              title={selectedDoc}
              srcDoc={detailQuery.data.documents[selectedDoc]}
            />
          ) : (
            <pre className="min-h-[320px] rounded-md border border-[var(--border)] bg-[var(--muted)] p-4 text-sm text-[var(--muted-foreground)]">
              run을 선택하세요.
            </pre>
          )}
        </Card>
      </div>
    </div>
  );
}
