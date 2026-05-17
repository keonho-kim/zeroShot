import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Eye, Layers3, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/app-store";
import { useArchitectFlowStore } from "@/stores/architect-store";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  allDecisionsAnswered,
  detectLocale,
  firstRoundEndIndex,
  selectedOption
} from "@/entities/architect/architect-core";
import {
  createArchitectProductHtml,
  fetchProjectSettings,
  fetchProjectState,
  requestArchitectDecisionsStream,
  runArchitectBootstrap
} from "@/lib/api";
import { cn } from "@/utils/cn";
import { clearMissingProjectSelection, hasValidSelectedProject, isMissingSelectedProjectError } from "@/entities/project/stale-project";

function bootstrapArg(args: string[], flag: string): string {
  const index = args.indexOf(flag);
  const value = index >= 0 ? args[index + 1] : "";
  return value && !value.startsWith("--") ? value : "";
}

function titleCase(value: string): string {
  if (!value) {
    return "";
  }
  if (value === "typescript") {
    return "TypeScript";
  }
  if (value === "javascript") {
    return "JavaScript";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function bootstrapLanguageSummary(args: string[]): { summary: string; profile: string } | null {
  const projectType = bootstrapArg(args, "--type");
  if (!projectType) {
    return null;
  }

  const language = bootstrapArg(args, "--language");
  const serverLanguage = bootstrapArg(args, "--server-language") || language;
  const uiLanguage = bootstrapArg(args, "--ui-language");
  const profile = bootstrapArg(args, "--profile");
  const typeLabel = titleCase(projectType);
  let stackLabel = "";

  if (projectType === "fullstack") {
    const serverLabel = titleCase(serverLanguage);
    const uiLabel = uiLanguage === "typescript" || uiLanguage === "javascript" ? "React" : titleCase(uiLanguage);
    stackLabel = [serverLabel, uiLabel].filter(Boolean).join(" + ");
  } else if (projectType === "frontend") {
    stackLabel = titleCase(uiLanguage || language);
  } else {
    stackLabel = titleCase(serverLanguage || language);
  }

  if (!stackLabel) {
    return null;
  }

  return {
    summary: `${typeLabel} · ${stackLabel}`,
    profile: profile === "llm" ? "LLM profile" : ""
  };
}

function AgentLoadingStage(props: { label: string }) {
  return (
    <div className="agent-loading-stage" role="status" aria-live="polite">
      <span className="agent-dot-wave" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <h2>{props.label}</h2>
    </div>
  );
}

export function ArchitectProgressPage() {
  const navigate = useNavigate();
  const projectRoot = useAppStore((state) => state.projectRoot);
  const setProjectRoot = useAppStore((state) => state.setProjectRoot);
  const setProjectState = useAppStore((state) => state.setProjectState);
  const setCandidateProjectPath = useAppStore((state) => state.setCandidateProjectPath);
  const setSelectedBrowserEntryPath = useAppStore((state) => state.setSelectedBrowserEntryPath);
  const setProjectPickerOpen = useAppStore((state) => state.setProjectPickerOpen);
  const setArchitectProductContent = useAppStore((state) => state.setArchitectProductContent);
  const locale = useMemo(() => detectLocale(navigator.language), []);
  const requestKey = useArchitectFlowStore((state) => state.requestKey);
  const startedRequestKey = useArchitectFlowStore((state) => state.startedRequestKey);
  const userBrief = useArchitectFlowStore((state) => state.userBrief);
  const submittedBrief = useArchitectFlowStore((state) => state.submittedBrief);
  const omakaseMode = useArchitectFlowStore((state) => state.omakaseMode);
  const decisionSet = useArchitectFlowStore((state) => state.decisionSet);
  const stepIndex = useArchitectFlowStore((state) => state.stepIndex);
  const answers = useArchitectFlowStore((state) => state.answers);
  const blueprintHtml = useArchitectFlowStore((state) => state.blueprintHtml);
  const blueprintReady = useArchitectFlowStore((state) => state.blueprintReady);
  const blueprintOpen = useArchitectFlowStore((state) => state.blueprintOpen);
  const tutorialOpen = useArchitectFlowStore((state) => state.tutorialOpen);
  const continuePromptOpen = useArchitectFlowStore((state) => state.continuePromptOpen);
  const architectError = useArchitectFlowStore((state) => state.architectError);
  const markRequestStarted = useArchitectFlowStore((state) => state.markRequestStarted);
  const addProgress = useArchitectFlowStore((state) => state.addProgress);
  const completeRequest = useArchitectFlowStore((state) => state.completeRequest);
  const failRequest = useArchitectFlowStore((state) => state.failRequest);
  const chooseOption = useArchitectFlowStore((state) => state.chooseOption);
  const setStepIndex = useArchitectFlowStore((state) => state.setStepIndex);
  const setBlueprintHtml = useArchitectFlowStore((state) => state.setBlueprintHtml);
  const setBlueprintReady = useArchitectFlowStore((state) => state.setBlueprintReady);
  const setBlueprintOpen = useArchitectFlowStore((state) => state.setBlueprintOpen);
  const setTutorialOpen = useArchitectFlowStore((state) => state.setTutorialOpen);
  const setContinuePromptOpen = useArchitectFlowStore((state) => state.setContinuePromptOpen);

  const projectStateQuery = useQuery({
    queryKey: ["project-state", projectRoot],
    queryFn: () => fetchProjectState(projectRoot),
    enabled: Boolean(projectRoot),
    retry: (failureCount, error) => !isMissingSelectedProjectError(error) && failureCount < 3
  });

  const projectSettingsQuery = useQuery({
    queryKey: ["project-settings", projectRoot],
    queryFn: () => fetchProjectSettings(projectRoot),
    enabled: hasValidSelectedProject(projectRoot, projectStateQuery.data),
    retry: (failureCount, error) => !isMissingSelectedProjectError(error) && failureCount < 3
  });

  const activeSkillId = projectSettingsQuery.data?.activeSkillId ?? "";
  const activeDesignTemplateId = projectSettingsQuery.data?.activeDesignTemplateId ?? "";
  const decisions = decisionSet?.decisions ?? [];
  const currentDecision = decisions[stepIndex];
  const isComplete = decisionSet !== null && stepIndex >= decisions.length;
  const currentSelection = currentDecision ? answers[currentDecision.id] : "";
  const pinnedChoices = decisionSet
    ? decisions.slice(0, Math.min(stepIndex, decisions.length)).map((decision) => ({
      decision,
      option: selectedOption(answers, decision)
    })).filter((item) => item.option)
    : [];
  const canCreateBlueprint = decisionSet !== null && allDecisionsAnswered(decisions, answers);
  const roundOneEndIndex = decisionSet ? firstRoundEndIndex(decisions) : -1;
  const roundOneDecision = decisions[roundOneEndIndex];
  const roundOneSelection = roundOneDecision ? answers[roundOneDecision.id] : "";
  const createBlueprintMutation = useMutation({
    mutationFn: async () => {
      if (!decisionSet || !canCreateBlueprint) {
        throw new Error("Architect decisions are required before a product blueprint can be created.");
      }
      return createArchitectProductHtml({
        projectRoot,
        userBrief: submittedBrief || userBrief,
        decisionSet,
        answers,
        locale,
        activeSkillId: activeSkillId || undefined,
        activeDesignTemplateId: activeDesignTemplateId || undefined
      });
    },
    onSuccess: (file) => {
      setBlueprintHtml(file.content);
      setArchitectProductContent(file.content);
      setBlueprintReady(true);
      setContinuePromptOpen(true);
    }
  });

  const bootstrapMutation = useMutation({
    mutationFn: async () => {
      if (!decisionSet) {
        throw new Error("Architect decisions are required before bootstrap.");
      }
      if (!hasValidSelectedProject(projectRoot, projectStateQuery.data)) {
        throw new Error("A valid selected project is required before bootstrap.");
      }
      return runArchitectBootstrap({
        projectRoot,
        answers,
        decisions: decisions.slice(0, roundOneEndIndex + 1)
      });
    }
  });
  const bootstrapSummary = bootstrapMutation.data ? bootstrapLanguageSummary(bootstrapMutation.data.args) : null;

  const selectDecisionOption = (optionId: string) => {
    if (!currentDecision) {
      return;
    }
    if (stepIndex <= roundOneEndIndex && optionId !== currentSelection && (bootstrapMutation.isSuccess || bootstrapMutation.isError)) {
      bootstrapMutation.reset();
    }
    chooseOption(currentDecision.id, optionId);
  };

  const goNext = () => {
    if (!decisionSet) {
      return;
    }
    if (stepIndex === roundOneEndIndex && roundOneSelection && !bootstrapMutation.isSuccess) {
      if (!bootstrapMutation.isPending) {
        bootstrapMutation.mutate(undefined, {
          onSuccess: () => setStepIndex((value) => Math.min(decisions.length, value + 1))
        });
      }
      return;
    }
    if (stepIndex + 1 >= decisions.length) {
      setStepIndex(decisions.length);
      if (!blueprintReady && !createBlueprintMutation.isPending) {
        createBlueprintMutation.mutate();
      } else if (blueprintReady) {
        setContinuePromptOpen(true);
      }
      return;
    }
    setStepIndex((value) => value + 1);
  };

  const closeBlueprint = () => {
    setBlueprintOpen(false);
    setContinuePromptOpen(true);
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data === "zeroshot:blueprint-end") {
        setContinuePromptOpen(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [setContinuePromptOpen]);

  useEffect(() => {
    if (!projectRoot || (!isMissingSelectedProjectError(projectStateQuery.error) && !isMissingSelectedProjectError(projectSettingsQuery.error))) {
      return;
    }
    clearMissingProjectSelection({
      setProjectRoot,
      setProjectState,
      setCandidateProjectPath,
      setSelectedBrowserEntryPath,
      setProjectPickerOpen
    });
  }, [
    projectRoot,
    projectSettingsQuery.error,
    projectStateQuery.error,
    setCandidateProjectPath,
    setProjectPickerOpen,
    setProjectRoot,
    setProjectState,
    setSelectedBrowserEntryPath
  ]);

  useEffect(() => {
    if (!projectRoot || !userBrief.trim() || !requestKey || projectSettingsQuery.isLoading || projectSettingsQuery.isError) {
      return;
    }
    if (projectStateQuery.isLoading || projectStateQuery.isError || !hasValidSelectedProject(projectRoot, projectStateQuery.data)) {
      return;
    }
    if (startedRequestKey === requestKey || decisionSet) {
      return;
    }

    markRequestStarted(requestKey);
    void requestArchitectDecisionsStream(
      {
        projectRoot,
        goal: [
          userBrief.trim(),
          "",
          omakaseMode
            ? "Omakase mode is enabled. Simulate the full architect conversation: generate the questions, choose the recommended answer for each question yourself, and make every first option the answer you would actually pick for this product."
            : "Guided mode is enabled. The user will answer each round question manually."
        ].join("\n"),
        locale,
        activeSkillId: activeSkillId || undefined,
        activeDesignTemplateId: activeDesignTemplateId || undefined
      },
      addProgress
    ).then((nextDecisionSet) => {
      completeRequest(nextDecisionSet);
    }).catch((error: unknown) => {
      failRequest(error instanceof Error ? error.message : String(error));
    });
  }, [
    activeDesignTemplateId,
    activeSkillId,
    addProgress,
    completeRequest,
    decisionSet,
    failRequest,
    locale,
    markRequestStarted,
    omakaseMode,
    projectRoot,
    projectStateQuery.data,
    projectStateQuery.isError,
    projectStateQuery.isLoading,
    projectSettingsQuery.isLoading,
    requestKey,
    startedRequestKey,
    userBrief
  ]);

  useEffect(() => {
    if (!omakaseMode || !decisionSet || !canCreateBlueprint || createBlueprintMutation.isPending || blueprintReady) {
      return;
    }
    createBlueprintMutation.mutate();
  }, [blueprintReady, canCreateBlueprint, createBlueprintMutation, createBlueprintMutation.isPending, decisionSet, omakaseMode]);

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  if (!userBrief.trim() || !requestKey) {
    return <Navigate to="/architect" replace />;
  }

  return (
    <div className="builder-shell architect-page">
      {blueprintReady ? (
        <Button className="view-blueprint-button" onClick={() => {
          setTutorialOpen(false);
          setBlueprintOpen(true);
        }}>
          <Eye className="size-4" />
          {locale === "ko" ? "제품 미리보기" : "VIEW PRODUCT"}
        </Button>
      ) : null}
      <PageHeader title="ARCHITECT" projectRoot={projectRoot} />
      <div className={cn("architect-chat", decisionSet && "architect-chat-board")}>
        <section className={cn("architect-thread", decisionSet && "architect-decision-workspace")} aria-label="Architect conversation">
          {!decisionSet ? (
            <Card className="architect-loading-card" aria-label="Architect progress">
              <AgentLoadingStage label={locale === "ko" ? "요구사항 분석 중" : "Analyzing requirements"} />
              {architectError ? (
                <p className="architect-error">{architectError}</p>
              ) : null}
            </Card>
          ) : null}

          {decisionSet ? (
            <>
              {isComplete ? (
                <div className="architect-blueprint-workspace">
                  <section className="architect-choice-board architect-blueprint-board" aria-label={locale === "ko" ? "설계 선택 보드" : "Blueprint choice board"}>
                    <div className="choice-board-heading">
                      <strong>{locale === "ko" ? "설계 보드" : "Blueprint board"}</strong>
                      <span>{pinnedChoices.length} / {decisions.length}</span>
                    </div>
                    <div className="pinned-choice-list">
                      <article className="pinned-choice-note architect-blueprint-note idea" style={{ ["--pin-index" as string]: 0 }}>
                        <span>{locale === "ko" ? "아이디어" : "Your idea"}</span>
                        <strong>{submittedBrief || userBrief}</strong>
                      </article>
                      {(bootstrapMutation.isPending || bootstrapMutation.isSuccess || bootstrapMutation.isError) ? (
                        <article className={cn("pinned-choice-note", "architect-blueprint-note", "bootstrap", bootstrapMutation.isError && "failed")} style={{ ["--pin-index" as string]: 1 }}>
                          <span>{locale === "ko" ? "부트스트랩" : "Bootstrap"}</span>
                          <strong>
                            {bootstrapMutation.isPending
                              ? (locale === "ko" ? "초기 구조 준비 중" : "Preparing structure")
                              : bootstrapMutation.isSuccess
                                ? (locale === "ko" ? "실행 컨텍스트 준비 완료" : "Execution context ready")
                                : (locale === "ko" ? "초기 구조 준비 실패" : "Bootstrap failed")}
                          </strong>
                          {bootstrapMutation.isSuccess && bootstrapSummary ? (
                            <p>{[bootstrapSummary.summary, bootstrapSummary.profile].filter(Boolean).join(" · ")}</p>
                          ) : null}
                        </article>
                      ) : null}
                      {pinnedChoices.map(({ decision, option }, index) => (
                        <article className="pinned-choice-note architect-blueprint-note" key={decision.id} style={{ ["--pin-index" as string]: index + 2 }}>
                          <span>{decision.title}</span>
                          <strong>{option?.label}</strong>
                          <p>{option?.detail}</p>
                        </article>
                      ))}
                    </div>
                  </section>

                  <div className="architect-stage-panel">
                    <Card className="decision-card complete architect-blueprint-status">
                      {createBlueprintMutation.isPending ? (
                        <AgentLoadingStage label={locale === "ko" ? "설계 도면 작성 중" : "Writing the product blueprint"} />
                      ) : (
                        <>
                          <div className="decision-kicker">{locale === "ko" ? "PRODUCT.html ready" : "PRODUCT.html ready"}</div>
                          <h2>{locale === "ko" ? "설계 도면 작성 완료" : "Product blueprint ready"}</h2>
                          <p>{locale === "ko" ? "Codex가 작성한 제품 기획서를 확인한 뒤 DESIGN으로 이어갈 수 있습니다." : "Review the Codex-written product blueprint, then continue into DESIGN."}</p>
                        </>
                      )}
                      {blueprintHtml ? (
                        <div className="product-html-preview architect-design-preview">
                          <iframe title="Product blueprint preview" srcDoc={blueprintHtml} />
                        </div>
                      ) : null}
                      {bootstrapMutation.isError ? (
                        <p className="architect-error">{bootstrapMutation.error instanceof Error ? bootstrapMutation.error.message : String(bootstrapMutation.error)}</p>
                      ) : null}
                      {createBlueprintMutation.isError ? <p className="architect-error">{locale === "ko" ? "PRODUCT.html을 생성하지 못했습니다." : "PRODUCT.html could not be created."}</p> : null}
                    </Card>
                  </div>
                </div>
              ) : (
                <>
                  <aside className="architect-left-notes" aria-label={locale === "ko" ? "초기 입력과 부트스트랩 상태" : "Initial brief and bootstrap status"}>
                    <div className="architect-brief-note">
                      <span>{locale === "ko" ? "아이디어" : "Your IDEA"}</span>
                      <p>{submittedBrief || userBrief}</p>
                    </div>

                    {(bootstrapMutation.isPending || bootstrapMutation.isSuccess || bootstrapMutation.isError) ? (
                      <div className={cn("architect-brief-note", "architect-bootstrap-note", bootstrapMutation.isError && "failed")}>
                        <span>{locale === "ko" ? "부트스트랩" : "Bootstrap"}</span>
                        <p>
                          {bootstrapMutation.isPending
                            ? (locale === "ko" ? "프로젝트 초기 구조를 준비하고 있어요." : "Preparing the initial project structure.")
                            : bootstrapMutation.isSuccess
                              ? (locale === "ko" ? "초기 프로젝트 구조와 Codex 실행 컨텍스트를 준비했습니다." : "Initial project structure and Codex execution context are ready.")
                              : (locale === "ko" ? "프로젝트 초기 구조 준비에 실패했습니다." : "Project bootstrap failed.")}
                        </p>
                        {bootstrapMutation.isSuccess && bootstrapSummary ? (
                          <div className="architect-bootstrap-summary">
                            <strong>{bootstrapSummary.summary}</strong>
                            {bootstrapSummary.profile ? <small>{bootstrapSummary.profile}</small> : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </aside>

                  <div className="architect-stage-panel">
                    {currentDecision ? (
                      <Card className="decision-card">
                        <div className="decision-kicker">
                          <Layers3 className="size-4" />
                          {currentDecision.section} · {stepIndex + 1} / {decisions.length}
                        </div>
                        <h2>{currentDecision.title}</h2>
                        <p>{currentDecision.prompt}</p>
                        {bootstrapMutation.isError ? (
                          <p className="architect-error">{bootstrapMutation.error instanceof Error ? bootstrapMutation.error.message : String(bootstrapMutation.error)}</p>
                        ) : null}
                        <div className="choice-grid">
                          {currentDecision.options.map((option, index) => {
                            const selected = currentSelection === option.id;
                            return (
                              <button
                                type="button"
                                className={cn("choice-card", selected && "selected")}
                                key={option.id}
                                disabled={bootstrapMutation.isPending || createBlueprintMutation.isPending}
                                onClick={() => selectDecisionOption(option.id)}
                              >
                                <span className="choice-check">{selected ? <Check className="size-4" /> : null}</span>
                                <strong>{option.label}{index === 0 ? (locale === "ko" ? " · 추천" : " · Recommended") : ""}</strong>
                                <span>{option.detail}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="decision-actions">
                          <Button variant="outline" disabled={stepIndex === 0} onClick={() => setStepIndex((value) => Math.max(0, value - 1))}>
                            <ArrowLeft className="size-4" />
                            {locale === "ko" ? "이전" : "Back"}
                          </Button>
                          <Button disabled={!currentSelection || bootstrapMutation.isPending || createBlueprintMutation.isPending || !canCreateBlueprint && stepIndex + 1 >= decisions.length} onClick={goNext}>
                            {stepIndex + 1 >= decisions.length
                              ? (locale === "ko" ? "PRODUCT.html 만들기" : "Create PRODUCT.html")
                              : (locale === "ko" ? "다음" : "Next")}
                            <ArrowRight className="size-4" />
                          </Button>
                        </div>
                      </Card>
                    ) : null}
                  </div>

                  <aside className="architect-choice-board" aria-label={locale === "ko" ? "선택 히스토리" : "Choice history"}>
                    <div className="choice-board-heading">
                      <strong>{locale === "ko" ? "선택 보드" : "Choice board"}</strong>
                      <span>{pinnedChoices.length} / {decisions.length}</span>
                    </div>
                    {pinnedChoices.length ? (
                      <div className="pinned-choice-list">
                        {pinnedChoices.map(({ decision, option }, index) => (
                          <article className="pinned-choice-note" key={decision.id} style={{ ["--pin-index" as string]: index }}>
                            <span>{decision.title}</span>
                            <strong>{option?.label}</strong>
                            <p>{option?.detail}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="choice-board-empty">{locale === "ko" ? "선택지가 여기에 정리됩니다." : "Choices will be pinned here."}</p>
                    )}
                  </aside>
                </>
              )}
            </>
          ) : null}
        </section>
      </div>
      {tutorialOpen ? (
        <div className="blueprint-tutorial" role="dialog" aria-modal="true" aria-label="Blueprint tutorial">
          <div className="tutorial-callout">
            <p>{locale === "ko" ? "여기를 눌러 방금 만든 제품 미리보기를 확인하세요." : "Tap here to view the product preview you just created."}</p>
          </div>
        </div>
      ) : null}
      {blueprintOpen ? (
        <div className="blueprint-viewer-backdrop" role="dialog" aria-modal="true" aria-label="Product blueprint">
          <div className="blueprint-viewer">
            <button type="button" className="blueprint-close" aria-label="Close blueprint" onClick={closeBlueprint}>
              <X className="size-6" />
            </button>
            <iframe title="Product blueprint" srcDoc={blueprintHtml} />
          </div>
        </div>
      ) : null}
      {continuePromptOpen ? (
        <div className="app-modal-backdrop" role="dialog" aria-modal="true" aria-label="Continue destination">
          <Card className="app-modal">
            <p className="modal-eyebrow">CONTINUE TO?</p>
            <h2>{locale === "ko" ? "다음 단계 선택" : "Choose the next step"}</h2>
            <p>{locale === "ko" ? "현재 설계를 바탕으로 디자인 검토를 시작합니다." : "Use the current blueprint to continue into design review."}</p>
            <div className="modal-actions">
              <Button
                variant="outline"
                disabled={createBlueprintMutation.isPending}
                onClick={() => navigate("/design", { state: { fromArchitect: true } })}
              >
                DESIGN
              </Button>
              <Button variant="outline" onClick={() => setContinuePromptOpen(false)}>CANCEL</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
