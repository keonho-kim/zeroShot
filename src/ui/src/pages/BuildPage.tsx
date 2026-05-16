import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, Check, FileCode2, FileText, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { fetchProjectState, startBuild } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { buildFocusOptions, composeBuildProductContent, type BuildFocus, type BuildSource } from "@/entities/project/build-request";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { RichPromptEditor } from "@/components/prompt/RichPromptEditor";
import { LogViewer } from "@/components/LogViewer";
import { cn } from "@/utils/cn";

function readUploadedFile(file: File): Promise<string> {
  return file.text();
}

export function BuildPage() {
  const projectRoot = useAppStore((state) => state.projectRoot);
  const setProjectState = useAppStore((state) => state.setProjectState);
  const currentJob = useAppStore((state) => state.currentJob);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
  const clearLogs = useAppStore((state) => state.clearLogs);
  const architectProductContent = useAppStore((state) => state.architectProductContent);
  const [productContent, setProductContent] = useState(architectProductContent);
  const [buildStage, setBuildStage] = useState<"source" | "request" | "run">("source");
  const [buildSource, setBuildSource] = useState<BuildSource>("product-html");
  const [buildFocus, setBuildFocus] = useState<BuildFocus>("faithful");
  const [additionalRequest, setAdditionalRequest] = useState("");
  const responseLanguage = navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";

  const stateQuery = useQuery({
    queryKey: ["project-state", projectRoot],
    queryFn: () => fetchProjectState(projectRoot),
    enabled: Boolean(projectRoot)
  });

  useEffect(() => {
    setProjectState(stateQuery.data ?? null);
  }, [setProjectState, stateQuery.data]);

  useEffect(() => {
    if (!productContent && architectProductContent) {
      setProductContent(architectProductContent);
    }
  }, [architectProductContent, productContent]);

  useEffect(() => {
    if (stateQuery.data && !stateQuery.data.hasProductHtml && buildSource === "product-html") {
      setBuildSource("product-md");
    }
  }, [buildSource, stateQuery.data]);

  useEffect(() => {
    setBuildStage("source");
    setAdditionalRequest("");
  }, [projectRoot]);

  const mutation = useMutation({
    mutationFn: async (input?: { additionalRequest?: string }) => {
      clearLogs();
      return startBuild({
        projectRoot,
        productContent: composeBuildProductContent({
          source: buildSource,
          productMarkdown: productContent,
          additionalRequest: input?.additionalRequest ?? additionalRequest,
          focus: buildFocus
        }),
        options: { responseLanguage }
      });
    },
    onSuccess: (job) => {
      setCurrentJob(job);
      setBuildStage("run");
    }
  });

  const buildSourceReady = buildSource === "product-html"
    ? Boolean(stateQuery.data?.hasProductHtml)
    : Boolean(productContent.trim());
  const disabled = !projectRoot || mutation.isPending || !buildSourceReady;
  const buildJob = currentJob?.mode === "build" ? currentJob : null;

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="builder-shell">
      <PageHeader title="BUILD" projectRoot={projectRoot} />
      {buildStage === "run" ? (
        <div className="build-run-screen">
          <Card className="agent-panel build-run-heading bg-[var(--panel)]">
            <div className="agent-panel-heading">
              <div className="agent-panel-icon">
                <Bot aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="agent-panel-kicker">CODEX AGENT</p>
                <h2>Build is running</h2>
                <p>요청 확인이 끝났습니다. 이제 작업 카드를 보며 진행 상황을 확인하세요.</p>
              </div>
            </div>
          </Card>
          <LogViewer job={buildJob} />
        </div>
      ) : (
        <Card className="build-setup-card bg-[var(--panel)]">
          <div className="agent-panel-heading">
            <div className="agent-panel-icon">
              {buildStage === "source" ? <FileCode2 aria-hidden="true" /> : <Send aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <p className="agent-panel-kicker">{buildStage === "source" ? "BUILD SOURCE" : "BUILD REQUEST"}</p>
              <h2>{buildStage === "source" ? "빌드 기준을 선택하세요" : "추가 요청사항 있으신가요?"}</h2>
              <p>
                {buildStage === "source"
                  ? "제품 블루프린트 또는 직접 입력한 제품 설명을 기준으로 Codex agent 실행을 준비합니다."
                  : "요청을 입력하거나 Skip으로 바로 실행할 수 있습니다."}
              </p>
            </div>
          </div>

          {buildStage === "source" ? (
            <>
              <div className="build-choice-grid">
                <button
                  type="button"
                  disabled={!stateQuery.data?.hasProductHtml}
                  className={cn("build-choice-card", buildSource === "product-html" && "selected")}
                  onClick={() => setBuildSource("product-html")}
                >
                  <FileCode2 aria-hidden="true" />
                  <span>PRODUCT BLUEPRINT</span>
                  <small>{stateQuery.data?.hasProductHtml ? "ARCHITECT에서 만든 블루프린트를 사용합니다." : "현재 프로젝트에 제품 블루프린트가 없습니다."}</small>
                </button>
                <button
                  type="button"
                  className={cn("build-choice-card", buildSource === "product-md" && "selected")}
                  onClick={() => setBuildSource("product-md")}
                >
                  <FileText aria-hidden="true" />
                  <span>제품 설명 직접 입력</span>
                  <small>업로드하거나 아래 입력값을 사용합니다.</small>
                </button>
              </div>

              {buildSource === "product-md" ? (
                <div className="build-upload-panel">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <FileText aria-hidden="true" className="size-4" />
                    제품 설명
                  </label>
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
                  <RichPromptEditor label="Product description" value={productContent} onChange={setProductContent} placeholder="제품 목적, 핵심 화면, 필요한 동작을 입력하세요." />
                </div>
              ) : null}

              <div className="build-setup-actions">
                <Button disabled={!buildSourceReady} onClick={() => setBuildStage("request")}>
                  다음
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="build-choice-grid">
                {buildFocusOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={cn("build-choice-card", buildFocus === option.id && "selected")}
                    onClick={() => setBuildFocus(option.id)}
                  >
                    {buildFocus === option.id ? <Check aria-hidden="true" /> : <span className="choice-dot" aria-hidden="true" />}
                    <span>{option.title}</span>
                    <small>{option.detail}</small>
                  </button>
                ))}
              </div>

              <div className="build-upload-panel">
                <label className="text-sm font-medium">추가 요청사항</label>
                <RichPromptEditor
                  label="Additional request"
                  value={additionalRequest}
                  onChange={setAdditionalRequest}
                  placeholder="예: 버튼을 더 크게 만들고, 모바일에서 첫 액션이 한 손으로 닿게 해주세요."
                />
              </div>

              {mutation.isError ? (
                <p className="architect-error">{mutation.error instanceof Error ? mutation.error.message : "BUILD를 시작하지 못했습니다."}</p>
              ) : null}

              <div className="build-setup-actions">
                <Button variant="outline" onClick={() => setBuildStage("source")}>
                  이전
                </Button>
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={() => {
                    setAdditionalRequest("");
                    mutation.mutate({ additionalRequest: "" });
                  }}
                >
                  Skip
                </Button>
                <Button disabled={disabled} onClick={() => mutation.mutate({})}>
                  {mutation.isPending ? "BUILD 시작 중..." : "요청 확인 완료"}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
