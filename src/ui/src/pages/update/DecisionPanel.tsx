import { Check, GitBranch, Layers3 } from "lucide-react";
import { selectedUpdateOption } from "@/entities/update/update-decisions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import type { UpdateDecisionResponse } from "@/types/api";

export function DecisionPanel({
  answers,
  canStartUpdate,
  decisionSet,
  mutationError,
  mutationPending,
  onChoose,
  onStart,
  setStepIndex,
  stepIndex
}: {
  answers: Record<string, string>;
  canStartUpdate: boolean;
  decisionSet: UpdateDecisionResponse;
  mutationError: unknown;
  mutationPending: boolean;
  onChoose: (decisionId: string, optionId: string) => void;
  onStart: () => void;
  setStepIndex: (value: number | ((current: number) => number)) => void;
  stepIndex: number;
}) {
  const { t } = useI18n();
  const decisions = decisionSet.decisions;
  const currentDecision = decisions[stepIndex];
  return (
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
                onClick={() => onChoose(currentDecision.id, option.id)}
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
          {mutationError ? (
            <p className="architect-error">{mutationError instanceof Error ? mutationError.message : t("update.startError")}</p>
          ) : null}
          <div className="decision-actions">
            <Button variant="outline" onClick={() => setStepIndex(Math.max(0, decisions.length - 1))}>
              {t("common.previous")}
            </Button>
            <Button disabled={!canStartUpdate || mutationPending} onClick={onStart}>
              <GitBranch aria-hidden="true" className="size-4" />
              {mutationPending ? t("update.starting") : t("update.start")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function choiceLabel(answers: Record<string, string>, decisionSet: UpdateDecisionResponse, decisionId: string): string {
  const decision = decisionSet.decisions.find((item) => item.id === decisionId);
  return decision ? selectedUpdateOption(answers, decision)?.label ?? "" : "";
}
