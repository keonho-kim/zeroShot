import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, Clock, Eye, Layers3, LoaderCircle, Palette, Send, Sparkles, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/app-store";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  allDecisionsAnswered,
  blueprintToProductMarkdown,
  buildBlueprintHtml,
  detectLocale,
  selectedOption,
  type ArchitectAnswers,
  type ArchitectDecisionSet
} from "@/entities/architect/architect-core";
import {
  fetchProjectSettings,
  fetchResources,
  requestArchitectDecisionsStream,
  saveProductHtml,
  saveProjectSettings,
  startBuild
} from "@/lib/api";
import type { ArchitectProgressEvent, ResourceManifest } from "@/types/api";
import { cn } from "@/utils/cn";

interface ArchitectTimelineItem extends ArchitectProgressEvent {
  updates: string[];
}

function upsertTimelineItem(items: ArchitectTimelineItem[], event: ArchitectProgressEvent): ArchitectTimelineItem[] {
  const index = items.findIndex((item) => item.id === event.id);
  if (index === -1) {
    return [...items, { ...event, updates: [event.detail] }];
  }

  return items.map((item, itemIndex) => {
    if (itemIndex !== index) {
      return item;
    }
    const updates = item.updates[item.updates.length - 1] === event.detail
      ? item.updates
      : [...item.updates, event.detail];
    return { ...item, ...event, updates };
  });
}

function ResourcePicker({
  label,
  icon,
  resources,
  value,
  onChange
}: {
  label: string;
  icon: ReactNode;
  resources: ResourceManifest[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="resource-picker">
      <div className="resource-picker-heading">
        {icon}
        <span>{label}</span>
      </div>
      <div className="resource-options">
        <button
          type="button"
          className={cn("resource-option", !value && "selected")}
          onClick={() => onChange("")}
        >
          <strong>Default</strong>
          <span>Use the ZeroShot workbench direction.</span>
        </button>
        {resources.map((resource) => (
          <button
            type="button"
            className={cn("resource-option", value === resource.id && "selected")}
            key={resource.id}
            onClick={() => onChange(resource.id)}
          >
            <strong>{resource.name}</strong>
            <span>{resource.description || resource.id}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ArchitectPage() {
  const navigate = useNavigate();
  const projectRoot = useAppStore((state) => state.projectRoot);
  const currentJob = useAppStore((state) => state.currentJob);
  const clearLogs = useAppStore((state) => state.clearLogs);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
  const setArchitectProductContent = useAppStore((state) => state.setArchitectProductContent);
  const locale = useMemo(() => detectLocale(navigator.language), []);
  const [userBrief, setUserBrief] = useState("");
  const [submittedBrief, setSubmittedBrief] = useState("");
  const [decisionSet, setDecisionSet] = useState<ArchitectDecisionSet | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<ArchitectAnswers>({});
  const [blueprintHtml, setBlueprintHtml] = useState("");
  const [blueprintReady, setBlueprintReady] = useState(false);
  const [blueprintOpen, setBlueprintOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [continuePromptOpen, setContinuePromptOpen] = useState(false);
  const [architectPending, setArchitectPending] = useState(false);
  const [architectError, setArchitectError] = useState("");
  const [timelineItems, setTimelineItems] = useState<ArchitectTimelineItem[]>([]);
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const [activeSkillId, setActiveSkillId] = useState("");
  const [activeDesignTemplateId, setActiveDesignTemplateId] = useState("");

  const resourcesQuery = useQuery({
    queryKey: ["resources"],
    queryFn: fetchResources
  });
  const projectSettingsQuery = useQuery({
    queryKey: ["project-settings", projectRoot],
    queryFn: () => fetchProjectSettings(projectRoot),
    enabled: Boolean(projectRoot)
  });

  const decisions = decisionSet?.decisions ?? [];
  const currentDecision = decisions[stepIndex];
  const isComplete = decisionSet !== null && stepIndex >= decisions.length;
  const currentSelection = currentDecision ? answers[currentDecision.id] : "";
  const canCreateBlueprint = decisionSet !== null && allDecisionsAnswered(decisions, answers);
  const markdownMirror = useMemo(
    () => blueprintToProductMarkdown(blueprintHtml),
    [blueprintHtml]
  );
  const activeSkill = resourcesQuery.data?.skills.find((resource) => resource.id === activeSkillId);
  const activeDesignTemplate = resourcesQuery.data?.designTemplates.find((resource) => resource.id === activeDesignTemplateId);

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
      const markdown = blueprintToProductMarkdown(html);
      await saveProductHtml({ projectRoot, content: html, markdownMirror: markdown });
      return { html, markdown, next };
    },
    onSuccess: ({ html, markdown, next }) => {
      setBlueprintHtml(html);
      setArchitectProductContent(markdown);
      setBlueprintReady(true);
      setContinuePromptOpen(false);
      if (next === "design") {
        navigate("/design");
        return;
      }
      if (next === "build") {
        buildMutation.mutate(markdown);
        return;
      }
    }
  });

  const buildMutation = useMutation({
    mutationFn: async (productContent?: string) => {
      clearLogs();
      return startBuild({ projectRoot, productContent: productContent ?? markdownMirror, options: { responseLanguage: locale } });
    },
    onSuccess: (job) => {
      setCurrentJob(job);
      navigate("/build");
    }
  });

  const saveProjectSettingsMutation = useMutation({
    mutationFn: async (next: { activeSkillId: string; activeDesignTemplateId: string }) => saveProjectSettings({
      projectRoot,
      activeSkillId: next.activeSkillId || undefined,
      activeDesignTemplateId: next.activeDesignTemplateId || undefined
    })
  });

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data === "zeroshot:blueprint-end") {
        setContinuePromptOpen(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!projectSettingsQuery.data) {
      return;
    }
    setActiveSkillId(projectSettingsQuery.data.activeSkillId ?? "");
    setActiveDesignTemplateId(projectSettingsQuery.data.activeDesignTemplateId ?? "");
  }, [projectSettingsQuery.data]);

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  const chooseOption = (optionId: string) => {
    if (!currentDecision) {
      return;
    }
    setAnswers((current) => ({ ...current, [currentDecision.id]: optionId }));
  };

  const requestDecisions = async () => {
    const trimmed = userBrief.trim();
    if (!trimmed || architectPending) {
      return;
    }
    setUserBrief(trimmed);
    setSubmittedBrief("");
    setDecisionSet(null);
    setAnswers({});
    setStepIndex(0);
    setBlueprintHtml("");
    setBlueprintReady(false);
    setBlueprintOpen(false);
    setContinuePromptOpen(false);
    setTutorialOpen(false);
    setArchitectError("");
    setTimelineItems([]);
    setExpandedTimelineId(null);
    setArchitectPending(true);

    try {
      const nextDecisionSet = await requestArchitectDecisionsStream(
        {
          projectRoot,
          goal: trimmed,
          locale,
          activeSkillId: activeSkillId || undefined,
          activeDesignTemplateId: activeDesignTemplateId || undefined
        },
        (event) => {
          setTimelineItems((items) => upsertTimelineItem(items, event));
          setExpandedTimelineId(event.id);
        }
      );
      setSubmittedBrief(trimmed);
      setDecisionSet(nextDecisionSet);
      setTimelineItems([]);
      setExpandedTimelineId(null);
    } catch (error) {
      setArchitectError(error instanceof Error ? error.message : String(error));
    } finally {
      setArchitectPending(false);
    }
  };

  const goNext = () => {
    if (!decisionSet) {
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

  const changeActiveSkill = (nextSkillId: string) => {
    setActiveSkillId(nextSkillId);
    saveProjectSettingsMutation.mutate({ activeSkillId: nextSkillId, activeDesignTemplateId });
  };

  const changeActiveDesignTemplate = (nextDesignTemplateId: string) => {
    setActiveDesignTemplateId(nextDesignTemplateId);
    saveProjectSettingsMutation.mutate({ activeSkillId, activeDesignTemplateId: nextDesignTemplateId });
  };

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
            <Card className="architect-input-card">
              <div>
                <p className="decision-kicker">{locale === "ko" ? "Product brief" : "Product brief"}</p>
                <h2>{locale === "ko" ? "어떤 제품을 만들까요?" : "What product should we shape?"}</h2>
                <p>{locale === "ko" ? "대상 사용자, 해결할 문제, 첫 화면에서 필요한 행동을 적어주세요." : "Describe the user, problem, and first actions the product should support."}</p>
              </div>
              <Textarea
                value={userBrief}
                onChange={(event) => setUserBrief(event.target.value)}
                placeholder={locale === "ko" ? "예: 기관 알림, 준비물, 일정, 선생님 메시지를 한곳에서 확인하고 바로 대응하는 보호자용 앱" : "Example: A parent app for checking school notices, supplies, schedules, and teacher messages in one place."}
              />
              <div className="resource-panel" aria-label="Architect resources">
                <div className="resource-panel-heading">
                  <p className="decision-kicker">{locale === "ko" ? "Open Design resources" : "Open Design resources"}</p>
                  <span>
                    {locale === "ko"
                      ? "~/.zeroshot의 SKILL.md와 design template을 자동으로 읽습니다."
                      : "Automatically loaded from ~/.zeroshot skills and design templates."}
                  </span>
                </div>
                <ResourcePicker
                  label={locale === "ko" ? "Skill" : "Skill"}
                  icon={<Sparkles className="size-4" />}
                  resources={resourcesQuery.data?.skills ?? []}
                  value={activeSkillId}
                  onChange={changeActiveSkill}
                />
                <ResourcePicker
                  label={locale === "ko" ? "Design template" : "Design template"}
                  icon={<Palette className="size-4" />}
                  resources={resourcesQuery.data?.designTemplates ?? []}
                  value={activeDesignTemplateId}
                  onChange={changeActiveDesignTemplate}
                />
              </div>
              {architectError ? (
                <p className="architect-error">{architectError}</p>
              ) : null}
              <div className="decision-actions">
                <Button disabled={!userBrief.trim() || architectPending} onClick={requestDecisions}>
                  <Send className="size-4" />
                  {architectPending ? (locale === "ko" ? "제품 방향 정리 중" : "Shaping product") : (locale === "ko" ? "제품 방향 잡기" : "Shape product")}
                </Button>
              </div>
            </Card>
          ) : null}

          {!decisionSet && timelineItems.length > 0 ? (
            <Card className="architect-timeline" aria-label="Architect progress">
              <div className="timeline-heading">
                <p className="decision-kicker">{locale === "ko" ? "Progress" : "Progress"}</p>
                <h2>{locale === "ko" ? "제품 방향을 정리하고 있어요." : "Shaping the product direction."}</h2>
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
              </div>
            </Card>
          ) : null}

          {submittedBrief ? (
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
                {stepIndex + 1} / {decisions.length}
              </div>
              <h2>{currentDecision.title}</h2>
              <p>{currentDecision.prompt}</p>
              <div className="choice-grid">
                {currentDecision.options.map((option) => {
                  const selected = currentSelection === option.id;
                  return (
                    <button
                      type="button"
                      className={cn("choice-card", selected && "selected")}
                      key={option.id}
                      onClick={() => chooseOption(option.id)}
                    >
                      <span className="choice-check">{selected ? <Check className="size-4" /> : null}</span>
                      <strong>{option.label}</strong>
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
                <Button disabled={!currentSelection || saveBlueprintMutation.isPending || !canCreateBlueprint && stepIndex + 1 >= decisions.length} onClick={goNext}>
                  {stepIndex + 1 >= decisions.length ? (locale === "ko" ? "제품 화면 만들기" : "Create product preview") : (locale === "ko" ? "다음" : "Next")}
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
