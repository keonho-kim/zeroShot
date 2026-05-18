import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Code2, FileText, GitBranch, Layers3, Terminal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { fetchProjectState, requestUpdateDecisionsStream, startUpdate } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/stores/app-store";
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
  const { locale, t, responseLanguage } = useI18n();
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
        throw new Error(t("update.decisionsRequired"));
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
        { projectRoot, updateRequest: updateContent.trim(), locale },
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
  const disabledReason = projectState
    ? projectState.runsCount < 1
      ? t("update.needsBuild")
      : t("update.noSourceToUpdate")
    : t("app.loadingAuth");
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
                <p className="agent-panel-kicker">{t("update.pipeline")}</p>
                <h2>{updateJob.status === "completed" ? t("update.completed") : updateJob.status === "failed" ? t("update.failed") : t("update.running")}</h2>
                <p>{t("update.runningDetail")}</p>
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
                    <p className="agent-panel-kicker">{t("update.requestKicker")}</p>
                    <p className="text-lg font-semibold">{t("update.requestTitle")}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("update.requestDescription")}
                    </p>
                  </div>
                </div>

                <div className="agent-status-grid">
                  <div>
                    <span>{t("common.project")}</span>
                    <strong title={projectRoot}>{projectName(projectRoot)}</strong>
                  </div>
                  <div>
                    <span>{t("update.latestRun")}</span>
                    <strong>{projectState?.latestRunName ?? t("common.none")}</strong>
                  </div>
                  <div>
                    <span>{t("update.sourceFiles")}</span>
                    <strong>{projectState?.sourceFileCount ?? 0}</strong>
                  </div>
                  <div>
                    <span>{t("update.sourceSize")}</span>
                    <strong>{formatBytes(projectState?.sourceBytes ?? 0)}</strong>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Code2 aria-hidden="true" className="size-4" />
                    {t("update.sourceMix")}
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
                      <p className="text-sm text-[var(--muted-foreground)]">{t("update.noSource")}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <FileText aria-hidden="true" className="size-4" />
                    {t("update.requestLabel")}
                  </label>
                  <RichPromptEditor label={t("update.requestLabel")} value={updateContent} onChange={setUpdateContent} placeholder={t("update.requestPlaceholder")} />
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
                    emptyMessage={t("update.organizingQuestions")}
                  />
                ) : null}

                <Button className="self-start" disabled={updateDisabled} onClick={requestDecisions}>
                  <Layers3 aria-hidden="true" className="size-4" />
                  {isGeneratingDecisions ? t("update.generatingQuestions") : t("update.generateQuestions")}
                </Button>
              </Card>
            ) : (
              <Card className="agent-panel flex flex-col gap-4 bg-[var(--panel)]">
                <div className="agent-panel-heading">
                  <div className="agent-panel-icon">
                    <Layers3 aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="agent-panel-kicker">{t("update.decisions")}</p>
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
                        {t("common.previous")}
                      </Button>
                      <Button
                        disabled={!answers[currentDecision.id]}
                        onClick={() => setStepIndex((value) => Math.min(decisions.length, value + 1))}
                      >
                        {t("common.next")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="decision-card update-decision-card complete">
                    <div className="decision-kicker">{t("update.ready")}</div>
                    <h2>{t("update.startTitle")}</h2>
                    <p>{t("update.startDetail")}</p>
                    {mutation.isError ? (
                      <p className="architect-error">{mutation.error instanceof Error ? mutation.error.message : t("update.startError")}</p>
                    ) : null}
                    <div className="decision-actions">
                      <Button variant="outline" onClick={() => setStepIndex(Math.max(0, decisions.length - 1))}>
                        {t("common.previous")}
                      </Button>
                      <Button disabled={!canStartUpdate || mutation.isPending} onClick={() => mutation.mutate()}>
                        <GitBranch aria-hidden="true" className="size-4" />
                        {mutation.isPending ? t("update.starting") : t("update.start")}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          <aside className="architect-choice-board update-choice-board" aria-label={t("update.choiceBoard")}>
            <div className="choice-board-heading">
              <strong>{t("update.choiceBoard")}</strong>
              <span>{Object.keys(answers).length} / {decisions.length || 0}</span>
            </div>
            <div className="pinned-choice-list">
              <article className="pinned-choice-note idea">
                <span>{t("common.request")}</span>
                <strong>{updateContent || t("update.requestEmpty")}</strong>
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
