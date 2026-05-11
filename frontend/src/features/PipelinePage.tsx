import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { fetchProjectState, startBuild, startUpdate } from "../lib/api";
import { useAppStore } from "../app/store";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { PageHeader } from "../components/PageHeader";
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
  const setProjectState = useAppStore((state) => state.setProjectState);
  const currentJob = useAppStore((state) => state.currentJob);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
  const clearLogs = useAppStore((state) => state.clearLogs);
  const architectProductContent = useAppStore((state) => state.architectProductContent);
  const [productContent, setProductContent] = useState(architectProductContent);
  const [updateContent, setUpdateContent] = useState("");
  const responseLanguage = navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";

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

  useEffect(() => {
    setProjectState(stateQuery.data ?? null);
  }, [setProjectState, stateQuery.data]);

  useEffect(() => {
    if (!productContent && architectProductContent) {
      setProductContent(architectProductContent);
    }
  }, [architectProductContent, productContent]);

  const mutation = useMutation({
    mutationFn: async () => {
      clearLogs();
      return mode === "build"
        ? startBuild({ projectRoot, ...(productContent.trim() ? { productContent } : {}), options: { responseLanguage } })
        : startUpdate({ projectRoot, productContent, updateContent });
    },
    onSuccess: setCurrentJob
  });

  const missingBuildSource = mode === "build" && !productContent.trim() && !stateQuery.data?.hasProduct && !stateQuery.data?.hasProductHtml;
  const disabled = !projectRoot ||
    mutation.isPending ||
    (mode === "build" && (!stateQuery.data?.buildEnabled || missingBuildSource)) ||
    (mode === "update" && !stateQuery.data?.updateEnabled);

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="builder-shell">
      <PageHeader title={mode === "build" ? "BUILD" : "UPDATE"} projectRoot={projectRoot} />
      <div className="build-workspace">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 bg-[var(--panel)]">
            <div>
              <p className="text-lg font-semibold">{mode === "build" ? "Build input" : "Update input"}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {mode === "build"
                  ? "PRODUCT.html 또는 입력된 PRODUCT.md를 기준으로 build 파이프라인을 실행합니다."
                  : "선택한 프로젝트 루트에 PRODUCT.md / UPDATE.md를 저장한 뒤 update 파이프라인을 실행합니다."}
              </p>
            </div>
            <div className="rounded-md bg-[var(--surface)] p-4 text-sm text-[var(--muted-foreground)]">
              <p>선택된 프로젝트: {projectRoot}</p>
              {mode === "build" ? <p>PRODUCT.html: {stateQuery.data?.hasProductHtml ? "있음" : "없음"}</p> : null}
              {mode === "build" ? <p>Workspace: {stateQuery.data?.isDirectoryEmpty ? "비어 있음" : "파일 있음"}</p> : null}
              {mode === "update" ? <p>Update 가능 여부: {stateQuery.data?.updateEnabled ? "가능" : "불가"}</p> : null}
            </div>
            <div className="flex flex-col gap-2">
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
              <div className="flex flex-col gap-2">
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
            <Button className="self-start" disabled={disabled} onClick={() => mutation.mutate()}>
              {mutation.isPending ? "실행 중..." : mode === "build" ? "Build 실행" : "Update 실행"}
            </Button>
          </Card>
        </div>
        <LogViewer job={currentJob} />
      </div>
    </div>
  );
}
