import { ArrowRight, LoaderCircle, PanelsTopLeft } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { designModeLabel, designModeOptions, designResultStatus } from "@/entities/design/design-runtime";
import type { DesignRuntimeMode, DesignRuntimeResponse, ResourceManifest } from "@/types/api";
import { cn } from "@/utils/cn";
import { modeIcon, projectName, resourceName } from "@/pages/design/design-page-model";

export function DesignRuntimeSetup(props: {
  projectRoot: string;
  resources: { skills: ResourceManifest[]; designTemplates: ResourceManifest[] };
  designResult: DesignRuntimeResponse | null;
  hasProductHtml: boolean;
  mode: DesignRuntimeMode;
  setMode: Dispatch<SetStateAction<DesignRuntimeMode>>;
  goal: string;
  setGoal: Dispatch<SetStateAction<string>>;
  activeSkillId: string;
  activeDesignTemplateId: string;
  runtimeError: string;
  isRunning: boolean;
  onChangeSkill: (nextSkillId: string) => void;
  onChangeDesignTemplate: (nextDesignTemplateId: string) => void;
  onRun: () => void;
}) {
  const navigate = useNavigate();
  const selectedMode = designModeOptions.find((option) => option.id === props.mode) ?? designModeOptions[0];

  return (
    <>
      <Card className="design-console">
        <div className="home-console-topline">
          <span>OPEN DESIGN RUNTIME</span>
          <span>{designResultStatus(props.designResult)}</span>
        </div>
        <div className="agent-panel-heading">
          <div className="agent-panel-icon">
            <PanelsTopLeft aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="agent-panel-kicker">{projectName(props.projectRoot)}</p>
            <h2>Design workbench</h2>
            <p>ARCHITECT 결과를 디자인 편집 가능한 산출물 계약으로 전환합니다.</p>
          </div>
        </div>
        <div className="agent-status-grid">
          <div>
            <span>SOURCE</span>
            <strong>{props.hasProductHtml ? "PRODUCT BLUEPRINT" : "WAIT"}</strong>
          </div>
          <div>
            <span>SKILL</span>
            <strong>{resourceName(props.resources.skills, props.activeSkillId)}</strong>
          </div>
          <div>
            <span>TEMPLATE</span>
            <strong>{resourceName(props.resources.designTemplates, props.activeDesignTemplateId)}</strong>
          </div>
          <div>
            <span>LAST DESIGN</span>
            <strong>{props.designResult ? designModeLabel(props.designResult.mode) : "NONE"}</strong>
          </div>
        </div>
      </Card>

      <section className="design-runtime-grid" aria-label="Design runtime modes">
        {designModeOptions.map((option) => (
          <button
            type="button"
            className={cn("design-mode-card", props.mode === option.id && "selected")}
            key={option.id}
            onClick={() => props.setMode(option.id)}
          >
            <span className="design-mode-icon">{modeIcon(option.id)}</span>
            <span className="design-mode-eyebrow">{option.eyebrow}</span>
            <strong>{option.title}</strong>
            <small>{option.detail}</small>
            <em>{option.output}</em>
          </button>
        ))}
      </section>

      <Card className="design-input-panel">
        <div>
          <p className="decision-kicker">{selectedMode.title}</p>
          <h2>{selectedMode.id === "codex" ? "무엇을 생성할까요?" : "무엇을 편집할까요?"}</h2>
          <p>{selectedMode.detail}</p>
        </div>

        <div className="design-resource-row">
          <label>
            <span>Skill</span>
            <select value={props.activeSkillId} onChange={(event) => props.onChangeSkill(event.target.value)}>
              <option value="">Default</option>
              {props.resources.skills.map((resource) => (
                <option key={resource.id} value={resource.id}>{resource.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Design Template</span>
            <select value={props.activeDesignTemplateId} onChange={(event) => props.onChangeDesignTemplate(event.target.value)}>
              <option value="">Default</option>
              {props.resources.designTemplates.map((resource) => (
                <option key={resource.id} value={resource.id}>{resource.name}</option>
              ))}
            </select>
          </label>
        </div>

        <Textarea
          value={props.goal}
          onChange={(event) => props.setGoal(event.target.value)}
          placeholder="예: 첫 화면을 더 조밀한 SaaS 대시보드처럼 정리하고, 와이어 프레임에서 컴포넌트 상태를 바로 만들 수 있게 해주세요."
        />

        {!props.hasProductHtml ? (
          <p className="architect-error">PRODUCT BLUEPRINT를 먼저 만들어야 DESIGN을 실행할 수 있습니다.</p>
        ) : null}

        {props.runtimeError ? <p className="architect-error">{props.runtimeError}</p> : null}

        <div className="decision-actions">
          <Button disabled={props.isRunning || !props.hasProductHtml} onClick={props.onRun}>
            {props.isRunning ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <ArrowRight aria-hidden="true" />}
            {props.isRunning ? "DESIGN 실행 중" : "DESIGN 런타임 실행"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/build")}>
            BUILD로 이동
          </Button>
        </div>
      </Card>
    </>
  );
}
