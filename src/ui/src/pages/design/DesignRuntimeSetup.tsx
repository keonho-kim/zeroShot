import { ArrowRight, Check, CheckCircle2, PanelsTopLeft } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { designModeLabel, designResultStatus } from "@/entities/design/design-runtime";
import type { DesignRuntimeResponse, ResourceManifest } from "@/types/api";
import { cn } from "@/utils/cn";
import { projectName, type DesignTimelineItem } from "@/pages/design/design-page-model";

const templateFallbacks = [
  {
    title: "제품에 맞춘 자유 구성",
    detail: "Codex가 제품 기획서와 요청을 기준으로 화면 밀도, 흐름, 시각 기조를 직접 정합니다."
  },
  {
    title: "모바일 앱처럼 빠른 흐름",
    detail: "핵심 액션, 상태 전환, 카드 구조를 앱 화면처럼 즉시 읽히게 구성합니다."
  },
  {
    title: "에디토리얼 콘텐츠 화면",
    detail: "읽기 리듬, 섹션 구분, 강조 카드를 살려 콘텐츠 중심 화면으로 정리합니다."
  },
  {
    title: "운영 대시보드형 화면",
    detail: "반복 사용자가 상태를 빠르게 훑고 처리할 수 있도록 정보 밀도를 높입니다."
  },
  {
    title: "프리미엄 서비스 화면",
    detail: "여백, 타이포그래피, CTA 위계를 정돈해 더 세련된 제품 인상을 만듭니다."
  },
  {
    title: "프로토타입 검증 화면",
    detail: "컴포넌트 상태, 빈 상태, 오류 상태를 함께 보여 바로 수정할 수 있게 만듭니다."
  },
  {
    title: "컴팩트 웹앱 화면",
    detail: "한 화면 안에서 주요 기능과 보조 정보를 조밀하지만 읽기 좋게 배치합니다."
  }
];

const systemFallbacks = [
  {
    title: "차분한 모던 제품 화면",
    detail: "여백, 명확한 위계, 제한된 색상으로 실사용 제품처럼 정돈합니다."
  },
  {
    title: "조밀한 운영 도구",
    detail: "반복 작업자가 빠르게 훑을 수 있게 정보 밀도와 상태 표시를 강화합니다."
  },
  {
    title: "에디토리얼 서비스",
    detail: "읽기 리듬, 큰 제목, 콘텐츠 카드 중심으로 브랜드 인상을 높입니다."
  },
  {
    title: "프리미엄 앱 경험",
    detail: "고급스러운 타이포그래피와 절제된 인터랙션으로 완성도를 끌어올립니다."
  },
  {
    title: "친근한 소비자 앱",
    detail: "부드러운 색감과 명확한 CTA로 처음 쓰는 사용자도 쉽게 이해하게 합니다."
  },
  {
    title: "브루탈한 프로토타입",
    detail: "강한 대비, 두꺼운 경계, 명확한 블록 구성으로 빠른 검토에 맞춥니다."
  }
];

function firstSentence(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  const sentence = normalized.match(/^.{24,180}?[.!?。]|^.{24,180}$/u)?.[0] ?? normalized;
  return sentence.trim();
}

function templateOption(resource: ResourceManifest | null, index: number) {
  const fallback = templateFallbacks[index] ?? templateFallbacks.at(-1)!;
  const description = firstSentence(resource?.description ?? "");
  return {
    title: fallback.title,
    detail: description && description !== "|" && description.length >= 8 ? description : fallback.detail
  };
}

function systemOption(resource: ResourceManifest | null, index: number) {
  const fallback = systemFallbacks[index] ?? systemFallbacks.at(-1)!;
  const description = firstSentence(resource?.description ?? resource?.body ?? "");
  return {
    title: fallback.title,
    detail: description && description !== "|" && description.length >= 8 ? description : fallback.detail
  };
}

function recommended(resources: ResourceManifest[], preferredIds: string[]) {
  const preferred = preferredIds
    .map((id) => resources.find((resource) => resource.id === id))
    .filter((resource): resource is ResourceManifest => Boolean(resource));
  const rest = resources.filter((resource) => !preferredIds.includes(resource.id));
  return [...preferred, ...rest].slice(0, 6);
}

export function DesignRuntimeSetup(props: {
  projectRoot: string;
  resources: { skills: ResourceManifest[]; designTemplates: ResourceManifest[]; designSystems: ResourceManifest[] };
  designResult: DesignRuntimeResponse | null;
  hasProductHtml: boolean;
  goal: string;
  setGoal: Dispatch<SetStateAction<string>>;
  activeDesignTemplateId: string;
  activeDesignSystemId: string;
  runtimeError: string;
  timelineItems: DesignTimelineItem[];
  isRunning: boolean;
  isComplete: boolean;
  onChangeDesignTemplate: (nextDesignTemplateId: string) => void;
  onChangeDesignSystem: (nextDesignSystemId: string) => void;
  onAutoRun: () => void;
  onRun: () => void;
}) {
  const recommendedTemplates = recommended(props.resources.designTemplates, ["web-prototype", "dashboard", "mobile-app", "saas-landing", "wireframe-sketch", "pricing-page"]);
  const recommendedSystems = recommended(props.resources.designSystems, ["default", "modern", "clean", "professional", "editorial", "neobrutalism"]);
  const activeTemplateIndex = recommendedTemplates.findIndex((resource) => resource.id === props.activeDesignTemplateId);
  const activeSystemIndex = recommendedSystems.findIndex((resource) => resource.id === props.activeDesignSystemId);
  const activeTemplateStatus = props.activeDesignTemplateId && activeTemplateIndex >= 0
    ? templateOption(recommendedTemplates[activeTemplateIndex], activeTemplateIndex + 1).title
    : templateOption(null, 0).title;
  const activeSystemStatus = props.activeDesignSystemId && activeSystemIndex >= 0
    ? systemOption(recommendedSystems[activeSystemIndex], activeSystemIndex).title
    : "Codex 추천 대기";

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
            <p>ARCHITECT 결과를 DESIGN/index.html 상호작용형 UI 산출물로 전환합니다.</p>
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
            <strong>{activeSystemStatus}</strong>
          </div>
          <div>
            <span>TEMPLATE</span>
            <strong>{activeTemplateStatus}</strong>
          </div>
          <div>
            <span>LAST DESIGN</span>
            <strong>{props.designResult ? designModeLabel(props.designResult.mode) : "NONE"}</strong>
          </div>
        </div>
      </Card>

      <Card className="design-input-panel">
        <div className="design-request-heading">
          <p className="decision-kicker">MAKEOVER REQUEST</p>
          <h2>무엇을 생성할까요?</h2>
          <p>원하는 디자인 방향을 적어주세요. 비워두고 싶다면 알아서 해주세요를 선택하면 됩니다.</p>
        </div>

        <div className="design-template-picker" aria-label="Codex recommended design templates">
          <div className="design-template-heading">
            <span>DESIGN SYSTEM</span>
            <strong>Codex 추천 디자인 기조 중 선택</strong>
          </div>
          <div className="design-template-grid">
            {recommendedSystems.map((resource, index) => {
              const option = systemOption(resource, index);
              const selected = props.activeDesignSystemId === resource.id;
              return (
                <button
                  type="button"
                  className={cn("choice-card", "design-template-card", selected && "selected")}
                  key={resource.id}
                  onClick={() => props.onChangeDesignSystem(resource.id)}
                >
                  <span className="choice-check">{selected ? <Check className="size-4" /> : null}</span>
                  <strong>{option.title}</strong>
                  <span>{option.detail}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="design-template-picker" aria-label="Codex recommended design templates">
          <div className="design-template-heading">
            <span>DESIGN TEMPLATE</span>
            <strong>Codex 추천 화면 구성 중 선택</strong>
          </div>
          <div className="design-template-grid">
            <button
              type="button"
              className={cn("choice-card", "design-template-card", !props.activeDesignTemplateId && "selected")}
              onClick={() => props.onChangeDesignTemplate("")}
            >
              <span className="choice-check">{!props.activeDesignTemplateId ? <Check className="size-4" /> : null}</span>
              <strong>{templateOption(null, 0).title}</strong>
              <span>{templateOption(null, 0).detail}</span>
            </button>
            {recommendedTemplates.map((resource, index) => {
              const option = templateOption(resource, index + 1);
              const selected = props.activeDesignTemplateId === resource.id;
              return (
              <button
                type="button"
                className={cn("choice-card", "design-template-card", selected && "selected")}
                key={resource.id}
                onClick={() => props.onChangeDesignTemplate(resource.id)}
              >
                <span className="choice-check">{selected ? <Check className="size-4" /> : null}</span>
                <strong>{option.title}</strong>
                <span>{option.detail}</span>
              </button>
              );
            })}
          </div>
        </div>

        <Textarea
          value={props.goal}
          onChange={(event) => props.setGoal(event.target.value)}
          placeholder="예: 첫 화면을 더 조밀한 SaaS 대시보드처럼 정리하고, 와이어 프레임에서 컴포넌트 상태를 바로 만들 수 있게 해주세요."
        />
        <div className="design-request-actions">
          <Button variant="outline" onClick={props.onAutoRun} disabled={props.isRunning || !props.hasProductHtml}>
            알아서 해주세요
          </Button>
          <Button disabled={props.isRunning || !props.hasProductHtml || !props.goal.trim()} onClick={props.onRun}>
            {props.isComplete ? <CheckCircle2 aria-hidden="true" /> : props.isRunning ? <span className="design-wave-loader" aria-hidden="true"><i /><i /><i /></span> : <ArrowRight aria-hidden="true" />}
            {props.isComplete ? "MAKEOVER 완료" : props.isRunning ? "MAKEOVER 실행 중" : "MAKEOVER 실행"}
          </Button>
        </div>

        {!props.hasProductHtml ? (
          <p className="architect-error">PRODUCT BLUEPRINT를 먼저 만들어야 DESIGN을 실행할 수 있습니다.</p>
        ) : null}

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
    </>
  );
}
