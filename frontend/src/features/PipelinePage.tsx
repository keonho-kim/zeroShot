import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchProjectState, startBuild, startUpdate } from "../lib/api";
import { useAppStore } from "../app/store";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { LogViewer } from "../components/LogViewer";

interface Props {
  mode: "build" | "update";
}

function readUploadedFile(file: File): Promise<string> {
  return file.text();
}

export function PipelinePage({ mode }: Props) {
  const projectRoot = useAppStore((state) => state.projectRoot);
  const currentJob = useAppStore((state) => state.currentJob);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
  const clearLogs = useAppStore((state) => state.clearLogs);
  const [productContent, setProductContent] = useState("");
  const [updateContent, setUpdateContent] = useState("");

  const stateQuery = useQuery({
    queryKey: ["project-state", projectRoot],
    queryFn: () => fetchProjectState(projectRoot),
    enabled: Boolean(projectRoot)
  });

  useEffect(() => {
    if (mode === "update" && stateQuery.data?.hasUpdate === false) {
      setUpdateContent("");
    }
  }, [mode, stateQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      clearLogs();
      return mode === "build"
        ? startBuild({ projectRoot, productContent })
        : startUpdate({ projectRoot, productContent, updateContent });
    },
    onSuccess: setCurrentJob
  });

  const disabled = !projectRoot || mutation.isPending || (mode === "update" && !stateQuery.data?.updateEnabled);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <Card className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{mode === "build" ? "Build" : "Update"}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {mode === "build"
                ? "선택한 프로젝트 루트에 PRODUCT.md를 저장한 뒤 build 파이프라인을 실행합니다."
                : "선택한 프로젝트 루트에 PRODUCT.md / UPDATE.md를 저장한 뒤 update 파이프라인을 실행합니다."}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-4 text-sm">
            <p>선택된 프로젝트: {projectRoot || "없음"}</p>
            {mode === "update" ? <p>Update 가능 여부: {stateQuery.data?.updateEnabled ? "가능" : "불가"}</p> : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">PRODUCT.md</label>
            <input
              type="file"
              accept=".md,text/markdown"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setProductContent(await readUploadedFile(file));
                }
              }}
            />
            <Textarea value={productContent} onChange={(event) => setProductContent(event.target.value)} placeholder="# PRODUCT" />
          </div>
          {mode === "update" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">UPDATE.md</label>
              <input
                type="file"
                accept=".md,text/markdown"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setUpdateContent(await readUploadedFile(file));
                  }
                }}
              />
              <Textarea value={updateContent} onChange={(event) => setUpdateContent(event.target.value)} placeholder="# UPDATE" />
            </div>
          ) : null}
          <Button disabled={disabled} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "실행 중..." : mode === "build" ? "Build 실행" : "Update 실행"}
          </Button>
        </Card>
      </div>
      <LogViewer job={currentJob} />
    </div>
  );
}
