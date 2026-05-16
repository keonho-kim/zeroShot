import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { fetchRunDetail, fetchRuns } from "@/lib/api";
import type { JobSnapshot } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocumentPreview, titleFromFilename } from "@/components/DocumentPreview";

interface Props {
  job: JobSnapshot | null;
}

export function RunArtifactsPreview({ job }: Props) {
  const [selectedFile, setSelectedFile] = useState("");
  const completed = job?.status === "completed";

  const runsQuery = useQuery({
    queryKey: ["completed-job-runs", job?.projectRoot, job?.id, job?.status],
    queryFn: () => fetchRuns(job?.projectRoot ?? ""),
    enabled: Boolean(completed && job?.projectRoot)
  });

  const runName = runsQuery.data?.[0]?.name ?? "";
  const detailQuery = useQuery({
    queryKey: ["completed-job-run-detail", job?.projectRoot, runName],
    queryFn: () => fetchRunDetail(job?.projectRoot ?? "", runName),
    enabled: Boolean(completed && job?.projectRoot && runName)
  });

  const documents = useMemo(() => {
    const entries = Object.entries(detailQuery.data?.documents ?? {})
      .filter(([filename, content]) => filename.toLowerCase().endsWith(".html") && content.trim());
    return Object.fromEntries(entries);
  }, [detailQuery.data?.documents]);
  const fileNames = useMemo(() => Object.keys(documents), [documents]);
  const activeFile = selectedFile && documents[selectedFile] ? selectedFile : fileNames[0] ?? "";

  useEffect(() => {
    if (fileNames.length && (!selectedFile || !documents[selectedFile])) {
      setSelectedFile(fileNames[0]);
    }
  }, [documents, fileNames, selectedFile]);

  if (!completed) {
    return null;
  }

  return (
    <Card className="flex flex-col gap-4 bg-[var(--panel)]">
      <div>
        <p className="text-sm font-semibold">Run artifacts</p>
        <p className="text-xs text-[var(--muted-foreground)]">완료된 {job.mode.toUpperCase()} 산출물을 HTML 프리뷰로 확인합니다.</p>
      </div>
      {detailQuery.isLoading || runsQuery.isLoading ? (
        <p className="text-sm text-[var(--muted-foreground)]">산출물을 불러오는 중입니다.</p>
      ) : null}
      {fileNames.length ? (
        <>
          <div className="flex flex-wrap gap-2">
            {fileNames.map((filename) => (
              <Button
                key={filename}
                variant={activeFile === filename ? "default" : "outline"}
                onClick={() => setSelectedFile(filename)}
              >
                {titleFromFilename(filename)}
              </Button>
            ))}
          </div>
          <DocumentPreview
            className="min-h-[640px] w-full rounded-md border border-[var(--border)] bg-white"
            filename={activeFile}
            content={documents[activeFile] ?? ""}
          />
        </>
      ) : !detailQuery.isLoading && !runsQuery.isLoading ? (
        <p className="text-sm text-[var(--muted-foreground)]">표시할 HTML 산출물이 없습니다.</p>
      ) : null}
    </Card>
  );
}
