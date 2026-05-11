import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Eye, Layers3, Send, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppStore } from "../app/store";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import {
  allDecisionsAnswered,
  blueprintToProductMarkdown,
  buildBlueprintHtml,
  detectLocale,
  selectedOption,
  type ArchitectAnswers,
  type ArchitectDecisionSet
} from "../entities/architect/architect-core";
import { requestArchitectDecisions, saveProductHtml, startBuild } from "../lib/api";
import { cn } from "../lib/utils";

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
  const [buildPromptOpen, setBuildPromptOpen] = useState(false);

  const decisions = decisionSet?.decisions ?? [];
  const currentDecision = decisions[stepIndex];
  const isComplete = decisionSet !== null && stepIndex >= decisions.length;
  const currentSelection = currentDecision ? answers[currentDecision.id] : "";
  const canCreateBlueprint = decisionSet !== null && allDecisionsAnswered(decisions, answers);
  const markdownMirror = useMemo(
    () => blueprintToProductMarkdown(blueprintHtml),
    [blueprintHtml]
  );

  const architectMutation = useMutation({
    mutationFn: async () => requestArchitectDecisions({ projectRoot, goal: userBrief, locale }),
    onSuccess: (nextDecisionSet) => {
      setSubmittedBrief(userBrief.trim());
      setDecisionSet(nextDecisionSet);
      setAnswers({});
      setStepIndex(0);
      setBlueprintHtml("");
      setBlueprintReady(false);
      setBlueprintOpen(false);
      setBuildPromptOpen(false);
      setTutorialOpen(false);
    }
  });

  const saveBlueprintMutation = useMutation({
    mutationFn: async () => {
      if (!decisionSet) {
        throw new Error("Architect decisions are required before PRODUCT.html can be created.");
      }
      const html = buildBlueprintHtml({
        locale,
        decisionSet,
        answers,
        projectRoot,
        userBrief: submittedBrief
      });
      const markdown = blueprintToProductMarkdown(html);
      await saveProductHtml({ projectRoot, content: html, markdownMirror: markdown });
      return { html, markdown };
    },
    onSuccess: ({ html, markdown }) => {
      setBlueprintHtml(html);
      setArchitectProductContent(markdown);
      setBlueprintReady(true);
      setTutorialOpen(true);
    }
  });

  const buildMutation = useMutation({
    mutationFn: async () => {
      clearLogs();
      return startBuild({ projectRoot, productContent: markdownMirror, options: { responseLanguage: locale } });
    },
    onSuccess: (job) => {
      setCurrentJob(job);
      navigate("/build");
    }
  });

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data === "zeroshot:blueprint-end") {
        setBuildPromptOpen(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  const chooseOption = (optionId: string) => {
    if (!currentDecision) {
      return;
    }
    setAnswers((current) => ({ ...current, [currentDecision.id]: optionId }));
  };

  const requestDecisions = () => {
    const trimmed = userBrief.trim();
    if (!trimmed) {
      return;
    }
    setUserBrief(trimmed);
    architectMutation.mutate();
  };

  const goNext = () => {
    if (!decisionSet) {
      return;
    }
    if (stepIndex + 1 >= decisions.length) {
      setStepIndex(decisions.length);
      saveBlueprintMutation.mutate();
      return;
    }
    setStepIndex((value) => value + 1);
  };

  const closeBlueprint = () => {
    setBlueprintOpen(false);
    setBuildPromptOpen(true);
  };

  return (
    <div className="builder-shell architect-page">
      {blueprintReady ? (
        <Button className="view-blueprint-button" onClick={() => {
          setTutorialOpen(false);
          setBlueprintOpen(true);
        }}>
          <Eye className="size-4" />
          VIEW BLUEPRINT
        </Button>
      ) : null}
      <PageHeader title="ARCHITECT" projectRoot={projectRoot} />
      <div className="architect-chat">
        <section className="architect-thread" aria-label="Architect conversation">
          <div className="chat-bubble assistant">
            <Sparkles className="size-4" />
            <span>{locale === "ko" ? "만들고 싶은 제품을 설명하면 Codex가 결정해야 할 JSON 옵션을 정리합니다." : "Describe the product. Codex will turn it into JSON decisions that must be resolved before PRODUCT.html."}</span>
          </div>

          {!decisionSet ? (
            <Card className="architect-input-card">
              <div>
                <p className="decision-kicker">{locale === "ko" ? "Codex conversation" : "Codex conversation"}</p>
                <h2>{locale === "ko" ? "무엇을 만들까요?" : "What should ZeroShot build?"}</h2>
                <p>{locale === "ko" ? "목표 사용자, 핵심 작업, 원하는 결과를 한 번에 적어주세요." : "Write the target user, core workflow, and expected outcome in one brief."}</p>
              </div>
              <Textarea
                value={userBrief}
                onChange={(event) => setUserBrief(event.target.value)}
                placeholder={locale === "ko" ? "예: 동네 베이커리가 오늘 생산량과 예약 주문을 관리하는 모바일 우선 웹앱..." : "Example: A mobile-first web app for a neighborhood bakery to manage daily production and preorders..."}
              />
              {architectMutation.isError ? (
                <p className="architect-error">{architectMutation.error.message}</p>
              ) : null}
              <div className="decision-actions">
                <Button disabled={!userBrief.trim() || architectMutation.isPending} onClick={requestDecisions}>
                  <Send className="size-4" />
                  {architectMutation.isPending ? "Asking Codex" : "Ask Codex"}
                </Button>
              </div>
            </Card>
          ) : null}

          {submittedBrief ? (
            <div className="chat-bubble user">
              <span>{submittedBrief}</span>
            </div>
          ) : null}

          {decisionSet ? (
            <div className="chat-bubble assistant">
              <Layers3 className="size-4" />
              <span>{decisionSet.summary}</span>
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
                  Back
                </Button>
                <Button disabled={!currentSelection || saveBlueprintMutation.isPending || !canCreateBlueprint && stepIndex + 1 >= decisions.length} onClick={goNext}>
                  {stepIndex + 1 >= decisions.length ? "Create PRODUCT.html" : "Next"}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </Card>
          ) : null}

          {isComplete ? (
            <Card className="decision-card complete">
              <div className="decision-kicker">PRODUCT.html ready</div>
              <h2>{locale === "ko" ? "Blueprint가 준비됐어요." : "Your blueprint is ready."}</h2>
              <p>{locale === "ko" ? "오른쪽 위 VIEW BLUEPRINT 버튼으로 Codex 결정 JSON에서 만든 PRODUCT.html을 확인하세요." : "Use the VIEW BLUEPRINT button at the top-right to inspect the PRODUCT.html generated from the Codex decision JSON."}</p>
              {saveBlueprintMutation.isError ? <p className="architect-error">PRODUCT.html could not be saved.</p> : null}
            </Card>
          ) : null}
        </section>
      </div>
      {tutorialOpen ? (
        <div className="blueprint-tutorial" role="dialog" aria-modal="true" aria-label="Blueprint tutorial">
          <div className="tutorial-callout">
            <p>{locale === "ko" ? "여기를 눌러 방금 만든 PRODUCT.html을 확인하세요." : "Tap here to view the PRODUCT.html blueprint you just created."}</p>
          </div>
        </div>
      ) : null}
      {blueprintOpen ? (
        <div className="blueprint-viewer-backdrop" role="dialog" aria-modal="true" aria-label="PRODUCT.html blueprint">
          <div className="blueprint-viewer">
            <button type="button" className="blueprint-close" aria-label="Close blueprint" onClick={closeBlueprint}>
              <X className="size-6" />
            </button>
            <iframe title="PRODUCT.html blueprint" srcDoc={blueprintHtml} />
          </div>
        </div>
      ) : null}
      {buildPromptOpen ? (
        <div className="app-modal-backdrop" role="dialog" aria-modal="true" aria-label="Start build confirmation">
          <Card className="app-modal">
            <p className="modal-eyebrow">BUILD</p>
            <h2>{locale === "ko" ? "이제 BUILD를 시작할까요?" : "Ready to start BUILD?"}</h2>
            <p>{locale === "ko" ? "PRODUCT.html을 확인했습니다. 이 blueprint를 바탕으로 빌드를 시작할 수 있습니다." : "You have reviewed PRODUCT.html. BUILD can now use this blueprint as the product source."}</p>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setBuildPromptOpen(false)}>NO</Button>
              <Button disabled={buildMutation.isPending || currentJob?.status === "running"} onClick={() => buildMutation.mutate()}>
                YES
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
