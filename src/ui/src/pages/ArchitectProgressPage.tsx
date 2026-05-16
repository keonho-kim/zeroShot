import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, Clock, Eye, Layers3, LoaderCircle, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/app-store";
import { useArchitectFlowStore } from "@/stores/architect-store";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  allDecisionsAnswered,
  buildBlueprintHtml,
  detectLocale,
  firstRoundEndIndex,
  selectedOption
} from "@/entities/architect/architect-core";
import {
  fetchProjectSettings,
  fetchResources,
  requestArchitectDecisionsStream,
  runArchitectBootstrap,
  saveProductHtml,
  startBuild
} from "@/lib/api";
import { cn } from "@/utils/cn";

export function ArchitectProgressPage() {
  const navigate = useNavigate();
  const projectRoot = useAppStore((state) => state.projectRoot);
  const currentJob = useAppStore((state) => state.currentJob);
  const clearLogs = useAppStore((state) => state.clearLogs);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
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
  const architectPending = useArchitectFlowStore((state) => state.architectPending);
  const architectError = useArchitectFlowStore((state) => state.architectError);
  const timelineItems = useArchitectFlowStore((state) => state.timelineItems);
  const expandedTimelineId = useArchitectFlowStore((state) => state.expandedTimelineId);
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
  const setExpandedTimelineId = useArchitectFlowStore((state) => state.setExpandedTimelineId);

  const resourcesQuery = useQuery({
    queryKey: ["resources"],
    queryFn: fetchResources
  });
  const projectSettingsQuery = useQuery({
    queryKey: ["project-settings", projectRoot],
    queryFn: () => fetchProjectSettings(projectRoot),
    enabled: Boolean(projectRoot)
  });

  const activeSkillId = projectSettingsQuery.data?.activeSkillId ?? "";
  const activeDesignTemplateId = projectSettingsQuery.data?.activeDesignTemplateId ?? "";
  const activeSkill = resourcesQuery.data?.skills.find((resource) => resource.id === activeSkillId);
  const activeDesignTemplate = resourcesQuery.data?.designTemplates.find((resource) => resource.id === activeDesignTemplateId);
  const decisions = decisionSet?.decisions ?? [];
  const currentDecision = decisions[stepIndex];
  const isComplete = decisionSet !== null && stepIndex >= decisions.length;
  const currentSelection = currentDecision ? answers[currentDecision.id] : "";
  const canCreateBlueprint = decisionSet !== null && allDecisionsAnswered(decisions, answers);
  const roundOneEndIndex = decisionSet ? firstRoundEndIndex(decisions) : -1;
  const roundOneDecision = decisions[roundOneEndIndex];
  const roundOneSelection = roundOneDecision ? answers[roundOneDecision.id] : "";
  const saveBlueprintMutation = useMutation({
    mutationFn: async (next: "design" | "build") => {
      if (!decisionSet) {
        throw new Error("Architect decisions are required before a product blueprint can be created.");
      }
      const html = buildBlueprintHtml({
        locale,
        decisionSet,
        answers,
        projectRoot,
        userBrief: submittedBrief,
        resources: {
          skillName: activeSkill?.name,
          designTemplateName: activeDesignTemplate?.name
        }
      });
      await saveProductHtml({ projectRoot, content: html });
      return { html, next };
    },
    onSuccess: ({ html, next }) => {
      setBlueprintHtml(html);
      setArchitectProductContent(html);
      setBlueprintReady(true);
      setContinuePromptOpen(false);
      if (next === "design") {
        navigate("/design");
        return;
      }
      if (next === "build") {
        buildMutation.mutate(html);
      }
    }
  });

  const buildMutation = useMutation({
    mutationFn: async (productContent?: string) => {
      clearLogs();
      return startBuild({ projectRoot, productContent, options: { responseLanguage: locale } });
    },
    onSuccess: (job) => {
      setCurrentJob(job);
      navigate("/build");
    }
  });

  const bootstrapMutation = useMutation({
    mutationFn: async () => {
      if (!decisionSet) {
        throw new Error("Architect decisions are required before bootstrap.");
      }
      return runArchitectBootstrap({
        projectRoot,
        answers,
        decisions: decisions.slice(0, roundOneEndIndex + 1)
      });
    }
  });

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
      return;
    }
    if (stepIndex + 1 >= decisions.length) {
      setStepIndex(decisions.length);
      setContinuePromptOpen(true);
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
    if (!projectRoot || !userBrief.trim() || !requestKey || projectSettingsQuery.isLoading) {
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
    projectSettingsQuery.isLoading,
    requestKey,
    startedRequestKey,
    userBrief
  ]);

  useEffect(() => {
    if (!decisionSet || roundOneEndIndex < 0 || !roundOneSelection || bootstrapMutation.isPending || bootstrapMutation.isSuccess || bootstrapMutation.isError) {
      return;
    }
    if (omakaseMode) {
      setContinuePromptOpen(false);
    }
    bootstrapMutation.mutate();
  }, [
    bootstrapMutation,
    bootstrapMutation.isError,
    bootstrapMutation.isPending,
    bootstrapMutation.isSuccess,
    decisionSet,
    omakaseMode,
    roundOneEndIndex,
    roundOneSelection,
    setContinuePromptOpen
  ]);

  useEffect(() => {
    if (!bootstrapMutation.isSuccess) {
      return;
    }
    if (stepIndex <= roundOneEndIndex) {
      setStepIndex(omakaseMode ? decisions.length : Math.min(decisions.length, roundOneEndIndex + 1));
    }
    if (omakaseMode) {
      setContinuePromptOpen(true);
    }
  }, [bootstrapMutation.isSuccess, decisions.length, omakaseMode, roundOneEndIndex, setContinuePromptOpen, setStepIndex, stepIndex]);

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
      <div className="architect-chat">
        <section className="architect-thread" aria-label="Architect conversation">
          {!decisionSet ? (
            <Card className="architect-timeline" aria-label="Architect progress">
              <div className="timeline-heading">
                <p className="decision-kicker">{locale === "ko" ? "Progress" : "Progress"}</p>
                <h2>{locale === "ko" ? "제품 방향을 정리하고 있어요." : "Shaping the product direction."}</h2>
                <p>{userBrief}</p>
              </div>
              <div className="timeline-list">
                {timelineItems.map((item) => {
                  const expanded = expandedTimelineId === item.id;
                  return (
                    <div className={cn("timeline-item", item.status)} key={item.id}>
                      <div className="timeline-status" aria-hidden="true">
                        {item.status === "completed" ? <CheckCircle2 className="size-4" /> : item.status === "failed" ? <AlertCircle className="size-4" /> : <LoaderCircle className="size-4 animate-spin" />}
                      </div>
                      <button
                        type="button"
                        className="timeline-summary"
                        onClick={() => setExpandedTimelineId(expanded ? null : item.id)}
                        aria-expanded={expanded}
                      >
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.detail}</small>
                        </span>
                        <span className="timeline-count">
                          {item.updates.length}
                          <Clock className="size-3" />
                        </span>
                        <ChevronDown className={cn("size-4 timeline-chevron", expanded && "open")} />
                      </button>
                      {expanded ? (
                        <div className="timeline-details">
                          {item.updates.map((update, index) => (
                            <p key={`${item.id}-${index}`}>{update}</p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {!timelineItems.length && architectPending ? (
                  <div className="timeline-item running">
                    <div className="timeline-status" aria-hidden="true">
                      <LoaderCircle className="size-4 animate-spin" />
                    </div>
                    <div className="timeline-summary">
                      <span>
                        <strong>{locale === "ko" ? "요청 준비 중" : "Preparing request"}</strong>
                        <small>{locale === "ko" ? "제품 방향 분석을 시작하고 있습니다." : "Starting product direction analysis."}</small>
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
              {architectError ? (
                <p className="architect-error">{architectError}</p>
              ) : null}
            </Card>
          ) : null}

          {submittedBrief && decisionSet ? (
            <div className="chat-bubble user">
              <span>{submittedBrief}</span>
            </div>
          ) : null}

          {decisions.slice(0, Math.min(stepIndex, decisions.length)).map((decision) => {
            const option = selectedOption(answers, decision);
            return option ? (
              <div className="chat-bubble user" key={decision.id}>
                <span>{option.label}</span>
              </div>
            ) : null;
          })}

          {decisionSet && !isComplete && currentDecision ? (
            <Card className="decision-card">
              <div className="decision-kicker">
                <Layers3 className="size-4" />
                {currentDecision.section} · {stepIndex + 1} / {decisions.length}
              </div>
              <h2>{currentDecision.title}</h2>
              <p>{currentDecision.prompt}</p>
              {bootstrapMutation.isPending ? (
                <div className="timeline-item running">
                  <div className="timeline-status" aria-hidden="true">
                    <LoaderCircle className="size-4 animate-spin" />
                  </div>
                  <div className="timeline-summary">
                    <span>
                      <strong>{locale === "ko" ? "프로젝트 부트스트랩 실행 중" : "Running project bootstrap"}</strong>
                      <small>{locale === "ko" ? "Round 1 선택을 기반으로 초기 구조와 프로젝트 컨텍스트를 생성합니다." : "Creating the initial structure and project context from Round 1 choices."}</small>
                    </span>
                  </div>
                </div>
              ) : null}
              {bootstrapMutation.isSuccess ? (
                <div className="timeline-item completed">
                  <div className="timeline-status" aria-hidden="true">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div className="timeline-summary">
                    <span>
                      <strong>{locale === "ko" ? "프로젝트 부트스트랩 완료" : "Project bootstrap complete"}</strong>
                      <small>{bootstrapMutation.data.command} {bootstrapMutation.data.args.join(" ")}</small>
                    </span>
                  </div>
                </div>
              ) : null}
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
                      disabled={bootstrapMutation.isPending}
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
                <Button disabled={!currentSelection || bootstrapMutation.isPending || stepIndex === roundOneEndIndex && !bootstrapMutation.isSuccess || saveBlueprintMutation.isPending || !canCreateBlueprint && stepIndex + 1 >= decisions.length} onClick={goNext}>
                  {stepIndex + 1 >= decisions.length
                    ? (locale === "ko" ? "제품 화면 만들기" : "Create product preview")
                    : (locale === "ko" ? "다음" : "Next")}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </Card>
          ) : null}

          {isComplete ? (
            <Card className="decision-card complete">
              <div className="decision-kicker">{locale === "ko" ? "Product preview ready" : "Product preview ready"}</div>
              <h2>{locale === "ko" ? "제품 미리보기가 준비됐어요." : "Your product preview is ready."}</h2>
              <p>{locale === "ko" ? "다음 단계로 디자인 검토를 계속하거나, 바로 BUILD를 시작할 수 있습니다." : "Continue into design review or start BUILD from this direction."}</p>
              {bootstrapMutation.isPending ? (
                <p>{locale === "ko" ? "Round 1 선택을 기반으로 프로젝트 부트스트랩을 실행 중입니다." : "Running project bootstrap from Round 1 choices."}</p>
              ) : null}
              {bootstrapMutation.isError ? (
                <p className="architect-error">{bootstrapMutation.error instanceof Error ? bootstrapMutation.error.message : String(bootstrapMutation.error)}</p>
              ) : null}
              {saveBlueprintMutation.isError ? <p className="architect-error">{locale === "ko" ? "제품 미리보기를 저장하지 못했습니다." : "The product preview could not be saved."}</p> : null}
              {buildMutation.isError ? <p className="architect-error">{locale === "ko" ? "BUILD를 시작하지 못했습니다." : "BUILD could not be started."}</p> : null}
            </Card>
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
            <p>{locale === "ko" ? "현재 설계를 바탕으로 디자인 검토를 진행하거나 바로 BUILD를 시작합니다." : "Use the current blueprint to continue into design review or start BUILD."}</p>
            <div className="modal-actions">
              <Button
                variant="outline"
                disabled={saveBlueprintMutation.isPending}
                onClick={() => saveBlueprintMutation.mutate("design")}
              >
                DESIGN
              </Button>
              <Button disabled={saveBlueprintMutation.isPending || buildMutation.isPending || currentJob?.status === "running"} onClick={() => saveBlueprintMutation.mutate("build")}>
                BUILD
              </Button>
              <Button variant="outline" onClick={() => setContinuePromptOpen(false)}>CANCEL</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
