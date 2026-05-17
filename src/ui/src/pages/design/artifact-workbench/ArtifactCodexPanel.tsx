import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DesignTimelineItem } from "@/pages/design/design-page-model";

export function ArtifactCodexPanel(props: {
  aiInstruction: string;
  setAiInstruction: (value: string) => void;
  timelineItems: DesignTimelineItem[];
  onApplySelectedTargetAiInstruction: () => void;
}) {
  return (
    <aside className="design-codex-panel" aria-label="Codex design chat">
      <div className="design-codex-chat">
        <span>CODEX CHAT</span>
        <strong>디자인 수정 요청</strong>
        <p>ARCHITECT와 현재 DESIGN 파일, 선택 컴포넌트 정보를 함께 넘겨 수정 요청을 준비합니다.</p>
        <Textarea
          value={props.aiInstruction}
          onChange={(event) => props.setAiInstruction(event.target.value)}
          placeholder="예: 선택한 카드의 밀도를 높이고 CTA를 더 선명하게 만들어줘."
        />
        <Button variant="outline" disabled={!props.aiInstruction.trim()} onClick={props.onApplySelectedTargetAiInstruction}>
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
