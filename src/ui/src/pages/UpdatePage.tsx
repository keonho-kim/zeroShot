import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Code2, FileText, GitBranch, Layers3, Terminal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { fetchProjectState, requestUpdateDecisionsStream, startUpdate } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { updateDisabledReason } from "@/entities/project/project-core";
import type { UpdateDecision, UpdateDecisionResponse, UpdateProgressEvent } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CodexLoadingLog } from "@/components/CodexLoadingLog";
import { PageHeader } from "@/components/PageHeader";
import { RichPromptEditor } from "@/components/prompt/RichPromptEditor";
import { LogViewer } from "@/components/LogViewer";
import { cn } from "@/utils/cn";

function projectName(projectRoot: string): string {
  return projectRoot.split("/").filter(Boolean).at(-1) || projectRoot;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 102.4) / 10} KB`;
  }
  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`;
}

function selectedOption(answers: Record<string, string>, decision: UpdateDecision) {
  return decision.options.find((option) => option.id === answers[decision.id]) ?? null;
}

function allDecisionsAnswered(decisions: UpdateDecision[], answers: Record<string, string>): boolean {
  return decisions.every((decision) => Boolean(answers[decision.id]));
}

function composeUpdateContent(params: {
  request: string;
  decisionSet: UpdateDecisionResponse;
  answers: Record<string, string>;
}): string {
  const selectedRequirements = params.decisionSet.decisions.map((decision) => {
    const selected = selectedOption(params.answers, decision) ?? decision.options[0];
    return [
      `Question: ${decision.title}`,
      `Selected: ${selected.label}`,
      `Requirement: ${selected.productRequirement}`
    ].join("\n");
  }).join("\n\n");

  return [
    "# UPDATE Request",
    "",
    params.request.trim(),
    "",
    "## Selected Update Decisions",
    "",
    selectedRequirements,
    "",
    "## Completion Requirements",
    "",
    "- Run the relevant test code before finishing the update.",
    "- Cross-check the implemented behavior against PRODUCT.html feature specifications.",
    "- Record any unverified behavior or PRODUCT mismatch clearly in the final work log."
  ].join("\n");
}

export function UpdatePage() {
  const projectRoot = useAppStore((state) => state.projectRoot);
  const setProjectState = useAppStore((state) => state.setProjectState);
  const currentJob = useAppStore((state) => state.currentJob);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
  const clearLogs = useAppStore((state) => state.clearLogs);
  const [updateContent, setUpdateContent] = useState("");
  const [decisionSet, setDecisionSet] = useState<UpdateDecisionResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [isGeneratingDecisions, setIsGeneratingDecisions] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [progressItems, setProgressItems] = useState<UpdateProgressEvent[]>([]);
  const [streamMessages, setStreamMessages] = useState<string[]>([]);
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
    setDecisionSet(null);
    setAnswers({});
    setStepIndex(0);
    setDecisionError("");
    setProgressItems([]);
    setStreamMessages([]);
  }, [projectRoot]);

  const decisions = decisionSet?.decisions ?? [];
  const currentDecision = decisions[stepIndex];
  const canStartUpdate = decisionSet !== null && allDecisionsAnswered(decisions, answers);
  const pinnedChoices = useMemo(() => decisions.slice(0, stepIndex).map((decision) => ({
    decision,
    option: selectedOption(answers, decision)
  })), [answers, decisions, stepIndex]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!decisionSet || !canStartUpdate) {
        throw new Error("Update decisions are required before UPDATE can start.");
      }
      clearLogs();
      return startUpdate({
        projectRoot,
        updateContent: composeUpdateContent({ request: updateContent, decisionSet, answers }),
        options: { responseLanguage }
      });
    },
    onSuccess: (job) => {
      setCurrentJob(job);
    }
  });

  async function requestDecisions() {
    if (!updateContent.trim()) {
      return;
    }
    setIsGeneratingDecisions(true);
    setDecisionError("");
    setDecisionSet(null);
    setAnswers({});
    setStepIndex(0);
    setProgressItems([]);
    setStreamMessages([]);
    try {
      const nextDecisionSet = await requestUpdateDecisionsStream(
        { projectRoot, updateRequest: updateContent.trim(), locale: responseLanguage },
        (event) => setProgressItems((items) => [...items.filter((item) => item.id !== event.id), event]),
        (message) => setStreamMessages((messages) => messages.at(-1) === message ? messages : [...messages, message])
      );
      setDecisionSet(nextDecisionSet);
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsGeneratingDecisions(false);
    }
  }

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  const projectState = stateQuery.data;
  const updateDisabled = !projectState?.updateEnabled || isGeneratingDecisions || !updateContent.trim();
  const disabledReason = projectState ? updateDisabledReason(projectState) : "프로젝트 상태를 확인하고 있습니다.";
  const updateJob = currentJob?.mode === "update" ? currentJob : null;

  return (
    <div className="builder-shell">
      <PageHeader title="UPDATE" projectRoot={projectRoot} />
      {updateJob ? (
        <div className="build-run-screen">
          <Card className="agent-panel build-run-heading bg-[var(--panel)]">
            <div className="agent-panel-heading">
              <div className="agent-panel-icon">
                <Terminal aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="agent-panel-kicker">UPDATE PIPELINE</p>
                <h2>{updateJob.status === "completed" ? "Update completed" : updateJob.status === "failed" ? "Update failed" : "Update is running"}</h2>
                <p>선택한 업데이트 방향을 기준으로 소스 수정과 검증을 진행합니다.</p>
              </div>
            </div>
          </Card>
          <LogViewer job={updateJob} />
        </div>
      ) : (
        <div className="build-workspace">
          <div className="flex flex-col gap-6">
            {!decisionSet ? (
              <Card className="agent-panel flex flex-col gap-4 bg-[var(--panel)]">
                <div className="agent-panel-heading">
                  <div className="agent-panel-icon">
                    <Terminal aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="agent-panel-kicker">UPDATE REQUEST</p>
                    <p className="text-lg font-semibold">변경할 내용을 입력하세요</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Codex가 PRODUCT와 현재 소스 기준으로 필요한 질문을 먼저 정리합니다.
                    </p>
                  </div>
                </div>

                <div className="agent-status-grid">
                  <div>
                    <span>PROJECT</span>
                    <strong title={projectRoot}>{projectName(projectRoot)}</strong>
                  </div>
                  <div>
                    <span>LATEST RUN</span>
                    <strong>{projectState?.latestRunName ?? "NONE"}</strong>
                  </div>
                  <div>
                    <span>SOURCE FILES</span>
                    <strong>{projectState?.sourceFileCount ?? 0}</strong>
                  </div>
                  <div>
                    <span>SOURCE SIZE</span>
                    <strong>{formatBytes(projectState?.sourceBytes ?? 0)}</strong>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Code2 aria-hidden="true" className="size-4" />
                    Source mix
                  </div>
                  <div className="grid gap-2">
                    {projectState?.languageStats.length ? projectState.languageStats.map((stat) => (
                      <div key={stat.language} className="grid gap-1">
                        <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                          <span>{stat.language}</span>
                          <span>{stat.percentage}% · {formatBytes(stat.bytes)}</span>
                        </div>
                        <div className="h-2 border-[2px] border-[var(--border)] bg-[var(--surface)]">
                          <div className="h-full bg-[var(--arcade-cyan)]" style={{ width: `${stat.percentage}%` }} />
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-[var(--muted-foreground)]">감지된 소스코드가 없습니다.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <FileText aria-hidden="true" className="size-4" />
                    업데이트 요청
                  </label>
                  <RichPromptEditor label="Update request" value={updateContent} onChange={setUpdateContent} placeholder="변경하거나 보완할 내용을 입력하세요." />
                </div>

                {projectState?.updateEnabled ? null : (
                  <p className="architect-error">{disabledReason}</p>
                )}
                {decisionError ? (
                  <p className="architect-error">{decisionError}</p>
                ) : null}

                {isGeneratingDecisions ? (
                  <CodexLoadingLog
                    progressItems={progressItems}
                    messages={streamMessages}
                    emptyMessage="업데이트 질문을 정리하고 있습니다."
                  />
                ) : null}

                <Button className="self-start" disabled={updateDisabled} onClick={requestDecisions}>
                  <Layers3 aria-hidden="true" className="size-4" />
                  {isGeneratingDecisions ? "질문 정리 중..." : "질문 생성"}
                </Button>
              </Card>
            ) : (
              <Card className="agent-panel flex flex-col gap-4 bg-[var(--panel)]">
                <div className="agent-panel-heading">
                  <div className="agent-panel-icon">
                    <Layers3 aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="agent-panel-kicker">UPDATE DECISIONS</p>
                    <p className="text-lg font-semibold">{decisionSet.title}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{decisionSet.summary}</p>
                  </div>
                </div>

                {currentDecision ? (
                  <div className="decision-card update-decision-card">
                    <div className="decision-kicker">
                      <Layers3 className="size-4" />
                      {currentDecision.section} · {stepIndex + 1} / {decisions.length}
                    </div>
                    <h2>{currentDecision.title}</h2>
                    <p>{currentDecision.prompt}</p>
                    <div className="decision-option-grid">
                      {currentDecision.options.map((option) => (
                        <button
                          type="button"
                          key={option.id}
                          className={cn("decision-option-card", answers[currentDecision.id] === option.id && "selected")}
                          onClick={() => setAnswers((value) => ({ ...value, [currentDecision.id]: option.id }))}
                        >
                          <span>{answers[currentDecision.id] === option.id ? <Check className="size-4" /> : null}</span>
                          <strong>{option.label}</strong>
                          <small>{option.detail}</small>
                        </button>
                      ))}
                    </div>
                    <div className="decision-actions">
                      <Button variant="outline" disabled={stepIndex === 0} onClick={() => setStepIndex((value) => Math.max(0, value - 1))}>
                        이전
                      </Button>
                      <Button
                        disabled={!answers[currentDecision.id]}
                        onClick={() => setStepIndex((value) => Math.min(decisions.length, value + 1))}
                      >
                        다음
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="decision-card update-decision-card complete">
                    <div className="decision-kicker">READY</div>
                    <h2>START UPDATE</h2>
                    <p>선택한 답변을 UPDATE.md로 정리하고, 테스트 실행과 PRODUCT 기능 명세 교차확인을 포함해 업데이트를 진행합니다.</p>
                    {mutation.isError ? (
                      <p className="architect-error">{mutation.error instanceof Error ? mutation.error.message : "UPDATE를 시작하지 못했습니다."}</p>
                    ) : null}
                    <div className="decision-actions">
                      <Button variant="outline" onClick={() => setStepIndex(Math.max(0, decisions.length - 1))}>
                        이전
                      </Button>
                      <Button disabled={!canStartUpdate || mutation.isPending} onClick={() => mutation.mutate()}>
                        <GitBranch aria-hidden="true" className="size-4" />
                        {mutation.isPending ? "UPDATE 시작 중..." : "START UPDATE"}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          <aside className="architect-choice-board update-choice-board" aria-label="Update choices">
            <div className="choice-board-heading">
              <strong>선택 보드</strong>
              <span>{Object.keys(answers).length} / {decisions.length || 0}</span>
            </div>
            <div className="pinned-choice-list">
              <article className="pinned-choice-note idea">
                <span>요청</span>
                <strong>{updateContent || "업데이트 요청을 입력하세요."}</strong>
              </article>
              {pinnedChoices.map(({ decision, option }, index) => (
                <article className="pinned-choice-note" key={decision.id} style={{ ["--pin-index" as string]: index + 1 }}>
                  <span>{decision.title}</span>
                  <strong>{option?.label}</strong>
                  <p>{option?.detail}</p>
                </article>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
