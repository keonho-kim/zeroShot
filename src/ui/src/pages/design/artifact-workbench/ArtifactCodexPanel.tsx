import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ArtifactChatMessage, ArtifactCommentCapture } from "@/pages/design/artifact-workbench/types";

export function ArtifactCodexPanel(props: {
  aiInstruction: string;
  setAiInstruction: (value: string) => void;
  commentCapture: ArtifactCommentCapture | null;
  chatMessages: ArtifactChatMessage[];
  isRunning: boolean;
  onApplySelectedTargetAiInstruction: () => void;
  onRemoveCommentCapture: () => void;
}) {
  const canSubmit = Boolean(props.aiInstruction.trim() || props.commentCapture) && !props.isRunning;

  return (
    <aside className="design-codex-panel" aria-label="Codex design chat">
      <div className="design-codex-chat">
        <span>CODEX CHAT</span>
        <strong>챗 UI</strong>
        <div className="design-chat-thread" role="log" aria-live="polite" aria-label="Makeover chat messages">
          {props.chatMessages.length ? props.chatMessages.map((message) => (
            <article className={`design-chat-message ${message.role}`} key={message.id}>
              <div className="design-chat-message-meta">
                <span>{message.role === "user" ? "YOU" : "CODEX"}</span>
                {message.isStreaming ? <i>streaming</i> : null}
              </div>
              {message.hasCommentCapture ? <span className="design-chat-attachment">Annotated canvas</span> : null}
              {message.content ? <p>{message.content}</p> : <p className="design-chat-stream-placeholder">응답 준비 중</p>}
              {message.progress.length ? (
                <div className="design-chat-progress">
                  {message.progress.map((item) => (
                    <span key={item.id} data-status={item.status}>{item.title}</span>
                  ))}
                </div>
              ) : null}
            </article>
          )) : (
            <article className="design-chat-message assistant">
              <div className="design-chat-message-meta">
                <span>CODEX</span>
              </div>
              <p>INTERACTIVE CANVAS 준비 완료.</p>
            </article>
          )}
        </div>
        <div className="design-chat-composer">
          {props.commentCapture ? (
            <div className="design-comment-chip">
              <span>Annotated canvas attached</span>
              <button type="button" onClick={props.onRemoveCommentCapture}>Remove</button>
            </div>
          ) : null}
          <Textarea
            value={props.aiInstruction}
            onChange={(event) => props.setAiInstruction(event.target.value)}
            placeholder="예: 화면 밀도를 낮추고, 중요한 액션이 먼저 보이게 정리해줘."
          />
          <Button variant="outline" disabled={!canSubmit} onClick={props.onApplySelectedTargetAiInstruction}>
            <SendHorizontal aria-hidden="true" />
            제출
          </Button>
        </div>
      </div>
    </aside>
  );
}
