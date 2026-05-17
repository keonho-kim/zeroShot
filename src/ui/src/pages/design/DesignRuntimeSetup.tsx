import { ArrowLeft, ArrowRight, Check, CheckCircle2, PanelsTopLeft, RefreshCw } from "lucide-react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { designModeLabel, designResultStatus } from "@/entities/design/design-runtime";
import type { DesignRecommendationOption, DesignRecommendationResponse, DesignRuntimeResponse, ResourceManifest } from "@/types/api";
import { cn } from "@/utils/cn";
import { projectName, type DesignTimelineItem } from "@/pages/design/design-page-model";

type SetupStep = "system" | "template" | "request";
type SelectionMode = "manual" | "omakase";

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
  return (
    <button
      type="button"
      className={cn("choice-card", "design-template-card", props.selected && "selected")}
      onClick={props.onSelect}
    >
      <span className="choice-check">{props.selected ? <Check className="size-4" /> : null}</span>
      <strong>알아서 해주세요</strong>
      <span>Codex가 가장 적합하다고 판단한 첫 번째 추천안을 사용합니다.</span>
      <small>추천 후보를 그대로 맡기고 다음 단계로 진행합니다.</small>
    </button>
  );
}

function SelectionBoard(props: {
  step: SetupStep;
  selectedSystem?: DesignRecommendationOption;
  selectedTemplate?: DesignRecommendationOption;
  goal: string;
}) {
  const notes = [
    props.selectedSystem
      ? {
        label: "Design system",
        title: props.selectedSystem.label,
        detail: props.selectedSystem.reason
      }
      : null,
    props.selectedTemplate
      ? {
        label: "Design template",
        title: props.selectedTemplate.label,
        detail: props.selectedTemplate.reason
      }
      : null,
    props.goal.trim()
      ? {
        label: "Request",
        title: "추가 요청사항",
        detail: props.goal.trim()
      }
      : null
  ].filter((note): note is { label: string; title: string; detail: string } => Boolean(note));

  return (
    <aside className="architect-choice-board design-choice-board" aria-label="Makeover selections">
      <div className="choice-board-heading">
        <strong>선택 보드</strong>
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
        <p className="choice-board-empty">선택지가 여기에 정리됩니다.</p>
      )}
    </aside>
  );
}

export function DesignRuntimeSetup(props: {
  projectRoot: string;
  resources: { skills: ResourceManifest[]; designTemplates: ResourceManifest[]; designSystems: ResourceManifest[] };
  recommendations: DesignRecommendationResponse | null;
  recommendationTimelineItems: DesignTimelineItem[];
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
  onAutoRun: () => void;
  onRun: () => void;
}) {
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
  const systemStatus = selectedSystem?.label ?? (props.resources.designSystems.length ? `${props.resources.designSystems.length} systems available` : "Codex 추천 대기");
  const templateStatus = selectedTemplate?.label ?? (props.resources.designTemplates.length ? `${props.resources.designTemplates.length} templates available` : "Codex 추천 대기");

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
            <h2>Makeover</h2>
            <p>ARCHITECT 결과를 INTERACTIVE CANVAS 상호작용형 UI 산출물로 전환합니다.</p>
          </div>
        </div>
        <div className="agent-status-grid">
          <div>
            <span>SOURCE</span>
            <strong>{props.hasProductHtml ? "ARCHITECT/PRODUCT.html" : "WAIT"}</strong>
          </div>
          <div>
            <span>SKILL</span>
            <strong>{props.resources.skills.length ? `${props.resources.skills.length} assets loaded` : "Default assets"}</strong>
          </div>
          <div>
            <span>DESIGN SYSTEM</span>
            <strong>{systemStatus}</strong>
          </div>
          <div>
            <span>TEMPLATE</span>
            <strong>{templateStatus}</strong>
          </div>
          <div>
            <span>LAST DESIGN</span>
            <strong>{props.designResult ? designModeLabel(props.designResult.mode) : "NONE"}</strong>
          </div>
        </div>
      </Card>

      {!props.hasProductHtml ? (
        <Card className="design-input-panel">
          <p className="architect-error">PRODUCT BLUEPRINT를 먼저 만들어야 DESIGN을 실행할 수 있습니다.</p>
        </Card>
      ) : null}

      {props.hasProductHtml && props.isLoadingRecommendations ? (
        <Card className="makeover-loading-card">
          <AgentLoadingStage label="디자인 후보 정리 중" />
          {props.recommendationTimelineItems.length ? (
            <div className="design-inline-log" aria-label="Recommendation progress">
              {props.recommendationTimelineItems.map((item) => (
                <div key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      {props.hasProductHtml && props.recommendationError ? (
        <Card className="design-input-panel">
          <p className="architect-error">{props.recommendationError}</p>
          <Button onClick={props.onRetryRecommendations}>
            <RefreshCw aria-hidden="true" />
            추천 다시 받기
          </Button>
        </Card>
      ) : null}

      {props.hasProductHtml && props.recommendations && !props.isLoadingRecommendations ? (
        <div className="design-request-layout">
          <Card className="design-input-panel">
            <div className="design-request-heading">
              <p className="decision-kicker">MAKEOVER REQUEST</p>
              <h2>{step === "system" ? "디자인 기조를 고를까요?" : step === "template" ? "화면 구성을 고를까요?" : "무엇을 더 반영할까요?"}</h2>
              <p>{props.recommendations.summary}</p>
            </div>

            {step === "system" ? (
              <div className="design-template-picker" aria-label="Codex recommended design systems">
                <div className="design-template-heading">
                  <span>DESIGN SYSTEM</span>
                  <strong>Codex가 ARCHITECT 결과와 디자인 자산을 보고 추천한 기조입니다.</strong>
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
              <div className="design-template-picker" aria-label="Codex recommended design templates">
                <div className="design-template-heading">
                  <span>DESIGN TEMPLATE</span>
                  <strong>Codex가 제품 흐름에 맞춰 추천한 화면 구성입니다.</strong>
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
                  placeholder="예: 전체적으로 현대적인 디자인으로 진행하게 해주세요. 컬러감을 확장해주세요."
                />
                <div className="design-request-actions">
                  <Button variant="outline" onClick={props.onAutoRun} disabled={props.isRunning}>
                    알아서 해주세요
                  </Button>
                  <Button disabled={props.isRunning || !props.goal.trim()} onClick={props.onRun}>
                    {props.isComplete ? <CheckCircle2 aria-hidden="true" /> : props.isRunning ? <span className="design-wave-loader" aria-hidden="true"><i /><i /><i /></span> : <ArrowRight aria-hidden="true" />}
                    {props.isComplete ? "MAKEOVER 완료" : props.isRunning ? "MAKEOVER 실행 중" : "MAKEOVER 실행"}
                  </Button>
                </div>
              </>
            ) : null}

            <div className="design-step-actions">
              <Button variant="outline" disabled={step === "system"} onClick={() => setStep(step === "request" ? "template" : "system")}>
                <ArrowLeft aria-hidden="true" />
                이전
              </Button>
              {step !== "request" ? (
                <Button
                  disabled={step === "system" ? !selectedSystem : !selectedTemplate}
                  onClick={() => setStep(step === "system" ? "template" : "request")}
                >
                  다음
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : null}
            </div>

            {props.runtimeError ? <p className="architect-error">{props.runtimeError}</p> : null}

            {props.timelineItems.length ? (
              <div className="design-inline-log" aria-label="Makeover progress">
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
