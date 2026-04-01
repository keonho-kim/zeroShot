import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAppStore } from "../app/store";
import { fetchRunDetail, fetchRuns } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";

export function HistoryPage() {
  const projectRoot = useAppStore((state) => state.projectRoot);
  const [selectedRun, setSelectedRun] = useState<string>("");
  const [selectedDoc, setSelectedDoc] = useState<string>("FINAL_REPORT.md");

  const runsQuery = useQuery({
    queryKey: ["runs", projectRoot],
    queryFn: () => fetchRuns(projectRoot),
    enabled: Boolean(projectRoot)
  });
  const detailQuery = useQuery({
    queryKey: ["run-detail", projectRoot, selectedRun],
    queryFn: () => fetchRunDetail(projectRoot, selectedRun),
    enabled: Boolean(projectRoot && selectedRun)
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <Card className="space-y-3">
        <h1 className="text-xl font-bold">History</h1>
        <div className="grid gap-2">
          {runsQuery.data?.map((run) => (
            <Button key={run.name} variant={selectedRun === run.name ? "default" : "outline"} onClick={() => setSelectedRun(run.name)}>
              {run.name}
            </Button>
          ))}
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {Object.keys(detailQuery.data?.documents ?? {}).map((doc) => (
            <Button key={doc} variant={selectedDoc === doc ? "default" : "outline"} onClick={() => setSelectedDoc(doc)}>
              {doc}
            </Button>
          ))}
        </div>
        <pre className="max-h-[620px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-50">
          {detailQuery.data?.documents[selectedDoc] || detailQuery.data?.manifest || "run을 선택하세요."}
        </pre>
      </Card>
    </div>
  );
}
