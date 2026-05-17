import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ArtifactEditTarget } from "@/entities/design/artifact-editor";
import type { DesignTimelineItem } from "@/pages/design/design-page-model";
import type { ArtifactCommentCapture } from "@/pages/design/artifact-workbench/types";

export function ArtifactCodexPanel(props: {
  aiInstruction: string;
  setAiInstruction: (value: string) => void;
  selectedTargets: ArtifactEditTarget[];
  commentCapture: ArtifactCommentCapture | null;
  timelineItems: DesignTimelineItem[];
  onApplySelectedTargetAiInstruction: () => void;
  onClearTargetSelection: () => void;
  onRemoveCommentCapture: () => void;
}) {
  return (
    <aside className="design-codex-panel" aria-label="Codex design chat">
      <div className="design-codex-chat">
        <span>CODEX CHAT</span>
        <strong>디자인 수정 요청</strong>
        <p>선택한 레이어는 멘션으로 함께 전달됩니다. 활성 스킬과 템플릿 컨텍스트도 요청에 포함됩니다.</p>
        {props.selectedTargets.length ? (
          <div className="design-chat-mentions" aria-label="Selected layer mentions">
            {props.selectedTargets.map((target) => (
              <span className="design-chat-mention" key={target.id}>@{target.label}</span>
            ))}
            <button type="button" className="design-chat-clear" onClick={props.onClearTargetSelection}>Clear</button>
          </div>
        ) : null}
        {props.commentCapture ? (
          <div className="design-comment-chip">
            <span>Annotated canvas attached</span>
            <button type="button" onClick={props.onRemoveCommentCapture}>Remove</button>
          </div>
        ) : null}
        <Textarea
          value={props.aiInstruction}
          onChange={(event) => props.setAiInstruction(event.target.value)}
          placeholder="예: 선택한 카드의 밀도를 높이고 CTA를 더 선명하게 만들어줘."
        />
        <Button variant="outline" disabled={!props.aiInstruction.trim() && !props.commentCapture} onClick={props.onApplySelectedTargetAiInstruction}>
          제출
        </Button>
      </div>

      <div className="design-work-log" aria-label="Design work log">
        <strong>작업 로그</strong>
        {props.timelineItems.length ? props.timelineItems.map((item) => (
          <div key={item.id}>
            <span>{item.title}</span>
            <small>{item.detail}</small>
          </div>
        )) : (
          <p>대기 중입니다.</p>
        )}
      </div>
    </aside>
  );
}
