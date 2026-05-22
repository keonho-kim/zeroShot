import { ArrowLeft, ArrowRight, Check, CheckCircle2, PanelsTopLeft, RefreshCw } from "lucide-react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CodexLoadingPanel } from "@/components/CodexLoadingPanel";
import { useI18n } from "@/lib/i18n";
import { designModeLabel, designResultStatus } from "@/entities/design/design-runtime";
import type { DesignRecommendationOption, DesignRecommendationResponse, DesignRuntimeResponse, ResourceManifest } from "@/types/api";
import { cn } from "@/utils/cn";
import { projectName, type DesignTimelineItem } from "@/pages/design/design-page-model";

type SetupStep = "system" | "template" | "request";
type SelectionMode = "manual" | "omakase";

function RecommendationOptionCard(props: {
  option: DesignRecommendationOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cn("choice-card", "design-template-card", props.selected && "selected")}
      onClick={props.onSelect}
    >
      <span className="choice-check">{props.selected ? <Check className="size-4" /> : null}</span>
      <strong>{props.option.label}</strong>
      <span>{props.option.detail}</span>
      <small>{props.option.reason}</small>
    </button>
  );
}

function OmakaseOptionCard(props: {
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className={cn("choice-card", "design-template-card", props.selected && "selected")}
      onClick={props.onSelect}
    >
      <span className="choice-check">{props.selected ? <Check className="size-4" /> : null}</span>
      <strong>{t("architect.omakase")}</strong>
      <span>{t("makeover.omakaseDetail")}</span>
      <small>{t("makeover.omakaseHint")}</small>
    </button>
  );
}

function SelectionBoard(props: {
  step: SetupStep;
  selectedSystem?: DesignRecommendationOption;
  selectedTemplate?: DesignRecommendationOption;
  goal: string;
}) {
  const { t } = useI18n();
  const notes = [
    props.selectedSystem
      ? {
        label: t("makeover.designSystem"),
        title: props.selectedSystem.label,
        detail: props.selectedSystem.reason
      }
      : null,
    props.selectedTemplate
      ? {
        label: t("makeover.designTemplate"),
        title: props.selectedTemplate.label,
        detail: props.selectedTemplate.reason
      }
      : null,
    props.goal.trim()
      ? {
        label: t("common.request"),
        title: t("update.requestLabel"),
        detail: props.goal.trim()
      }
      : null
  ].filter((note): note is { label: string; title: string; detail: string } => Boolean(note));

  return (
    <aside className="architect-choice-board design-choice-board" aria-label={t("makeover.selectionBoard")}>
      <div className="choice-board-heading">
        <strong>{t("architect.choiceBoard")}</strong>
        <span>{props.step === "system" ? "1 / 3" : props.step === "template" ? "2 / 3" : "3 / 3"}</span>
      </div>
      {notes.length ? (
        <div className="pinned-choice-list">
          {notes.map((note, index) => (
            <div className="pinned-choice-note" key={note.label} style={{ "--pin-index": index } as CSSProperties}>
              <span>{note.label}</span>
              <strong>{note.title}</strong>
              <p>{note.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="choice-board-empty">{t("architect.choicesPinned")}</p>
      )}
    </aside>
  );
}

export function DesignRuntimeSetup(props: {
  projectRoot: string;
  resources: { skills: ResourceManifest[]; designTemplates: ResourceManifest[]; designSystems: ResourceManifest[] };
  recommendations: DesignRecommendationResponse | null;
  recommendationTimelineItems: DesignTimelineItem[];
  recommendationMessages: string[];
  recommendationError: string;
  isLoadingRecommendations: boolean;
  designResult: DesignRuntimeResponse | null;
  hasProductHtml: boolean;
  goal: string;
  setGoal: Dispatch<SetStateAction<string>>;
  activeDesignTemplateId: string;
  activeDesignSystemId: string;
  activeDesignTemplateSelectionMode: SelectionMode;
  activeDesignSystemSelectionMode: SelectionMode;
  runtimeError: string;
  timelineItems: DesignTimelineItem[];
  isRunning: boolean;
  isComplete: boolean;
  onChangeDesignTemplate: (nextDesignTemplateId: string, mode: SelectionMode) => void;
  onChangeDesignSystem: (nextDesignSystemId: string, mode: SelectionMode) => void;
  onRetryRecommendations: () => void;
  onRun: () => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<SetupStep>("system");
  const selectedSystem = useMemo(
    () => props.recommendations?.designSystems.find((option) => option.resourceId === props.activeDesignSystemId),
    [props.activeDesignSystemId, props.recommendations]
  );
  const selectedTemplate = useMemo(
    () => props.recommendations?.designTemplates.find((option) => option.resourceId === props.activeDesignTemplateId),
    [props.activeDesignTemplateId, props.recommendations]
  );
  const firstSystem = props.recommendations?.designSystems[0];
  const firstTemplate = props.recommendations?.designTemplates[0];
  const systemStatus = selectedSystem?.label ?? (props.resources.designSystems.length ? t("makeover.systemsAvailable", { count: props.resources.designSystems.length }) : t("makeover.waitingRecommendation"));
  const templateStatus = selectedTemplate?.label ?? (props.resources.designTemplates.length ? t("makeover.templatesAvailable", { count: props.resources.designTemplates.length }) : t("makeover.waitingRecommendation"));

  return (
    <>
      <Card className="design-console">
        <div className="home-console-topline">
          <span>MAKEOVER</span>
          <span>{designResultStatus(props.designResult)}</span>
        </div>
        <div className="agent-panel-heading">
          <div className="agent-panel-icon">
            <PanelsTopLeft aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="agent-panel-kicker">{projectName(props.projectRoot)}</p>
            <h2>{t("makeover.title")}</h2>
            <p>{t("makeover.description")}</p>
          </div>
        </div>
        <div className="agent-status-grid">
          <div>
            <span>{t("makeover.source")}</span>
            <strong>{props.hasProductHtml ? "ARCHITECT/PRODUCT.html" : t("common.wait")}</strong>
          </div>
          <div>
            <span>{t("makeover.skill")}</span>
            <strong>{props.resources.skills.length ? t("makeover.assetsLoaded", { count: props.resources.skills.length }) : t("makeover.defaultAssets")}</strong>
          </div>
          <div>
            <span>{t("makeover.designSystem")}</span>
            <strong>{systemStatus}</strong>
          </div>
          <div>
            <span>{t("makeover.designTemplate")}</span>
            <strong>{templateStatus}</strong>
          </div>
          <div>
            <span>{t("makeover.lastDesign")}</span>
            <strong>{props.designResult ? designModeLabel(props.designResult.mode) : t("common.none")}</strong>
          </div>
        </div>
      </Card>

      {!props.hasProductHtml ? (
        <Card className="design-input-panel">
          <p className="architect-error">{t("makeover.requiresProduct")}</p>
        </Card>
      ) : null}

      {props.hasProductHtml && props.isLoadingRecommendations ? (
        <Card className="makeover-loading-card">
          <CodexLoadingPanel
            label={t("makeover.candidatesLoading")}
            progressItems={props.recommendationTimelineItems}
            messages={props.recommendationMessages}
            emptyMessage={t("makeover.recommendationLoadingMessage")}
          />
        </Card>
      ) : null}

      {props.hasProductHtml && props.recommendationError ? (
        <Card className="design-input-panel">
          <p className="architect-error">{props.recommendationError}</p>
          <Button onClick={props.onRetryRecommendations}>
            <RefreshCw aria-hidden="true" />
            {t("makeover.retryRecommendations")}
          </Button>
        </Card>
      ) : null}

      {props.hasProductHtml && props.recommendations && !props.isLoadingRecommendations ? (
        <div className="design-request-layout">
          <Card className="design-input-panel">
            <div className="design-request-heading">
              <p className="decision-kicker">{t("makeover.request")}</p>
              <h2>{step === "system" ? t("makeover.systemQuestion") : step === "template" ? t("makeover.templateQuestion") : t("makeover.extraQuestion")}</h2>
              <p>{props.recommendations.summary}</p>
            </div>

            {step === "system" ? (
              <div className="design-template-picker" aria-label={t("makeover.systemGuide")}>
                <div className="design-template-heading">
                  <span>{t("makeover.designSystem")}</span>
                  <strong>{t("makeover.systemGuide")}</strong>
                </div>
                <div className="design-template-grid">
                  {props.recommendations.designSystems.map((option) => (
                    <RecommendationOptionCard
                      key={option.id}
                      option={option}
                      selected={props.activeDesignSystemSelectionMode === "manual" && props.activeDesignSystemId === option.resourceId}
                      onSelect={() => props.onChangeDesignSystem(option.resourceId, "manual")}
                    />
                  ))}
                  {firstSystem ? (
                    <OmakaseOptionCard
                      selected={props.activeDesignSystemSelectionMode === "omakase" && props.activeDesignSystemId === firstSystem.resourceId}
                      onSelect={() => props.onChangeDesignSystem(firstSystem.resourceId, "omakase")}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}

            {step === "template" ? (
              <div className="design-template-picker" aria-label={t("makeover.templateGuide")}>
                <div className="design-template-heading">
                  <span>{t("makeover.designTemplate")}</span>
                  <strong>{t("makeover.templateGuide")}</strong>
                </div>
                <div className="design-template-grid">
                  {props.recommendations.designTemplates.map((option) => (
                    <RecommendationOptionCard
                      key={option.id}
                      option={option}
                      selected={props.activeDesignTemplateSelectionMode === "manual" && props.activeDesignTemplateId === option.resourceId}
                      onSelect={() => props.onChangeDesignTemplate(option.resourceId, "manual")}
                    />
                  ))}
                  {firstTemplate ? (
                    <OmakaseOptionCard
                      selected={props.activeDesignTemplateSelectionMode === "omakase" && props.activeDesignTemplateId === firstTemplate.resourceId}
                      onSelect={() => props.onChangeDesignTemplate(firstTemplate.resourceId, "omakase")}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}

            {step === "request" ? (
              <>
                <Textarea
                  value={props.goal}
                  onChange={(event) => props.setGoal(event.target.value)}
                  placeholder={t("makeover.placeholder")}
                />
                <div className="design-request-actions">
                  <Button disabled={props.isRunning} onClick={props.onRun}>
                    {props.isComplete ? <CheckCircle2 aria-hidden="true" /> : props.isRunning ? <span className="design-wave-loader" aria-hidden="true"><i /><i /><i /></span> : <ArrowRight aria-hidden="true" />}
                    {props.isComplete ? t("makeover.done") : props.isRunning ? t("makeover.running") : t("makeover.run")}
                  </Button>
                </div>
              </>
            ) : null}

            <div className="design-step-actions">
              <Button variant="outline" disabled={step === "system"} onClick={() => setStep(step === "request" ? "template" : "system")}>
                <ArrowLeft aria-hidden="true" />
                {t("common.previous")}
              </Button>
              {step !== "request" ? (
                <Button
                  disabled={step === "system" ? !selectedSystem : !selectedTemplate}
                  onClick={() => setStep(step === "system" ? "template" : "request")}
                >
                  {t("common.next")}
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : null}
            </div>

            {props.runtimeError ? <p className="architect-error">{props.runtimeError}</p> : null}

            {props.timelineItems.length ? (
              <div className="design-inline-log" aria-label={t("makeover.running")}>
                {props.timelineItems.map((item) => (
                  <div key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          <SelectionBoard
            step={step}
            selectedSystem={selectedSystem}
            selectedTemplate={selectedTemplate}
            goal={props.goal}
          />
        </div>
      ) : null}
    </>
  );
}
