import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ArtifactEditTarget } from "@/entities/design/artifact-editor";
import type { ArtifactChatMessage, ArtifactCommentCapture } from "@/pages/design/artifact-workbench/types";
import { useI18n } from "@/lib/i18n";

export function ArtifactCodexPanel(props: {
  aiInstruction: string;
  setAiInstruction: (value: string) => void;
  selectedTargets: ArtifactEditTarget[];
  commentCapture: ArtifactCommentCapture | null;
  chatMessages: ArtifactChatMessage[];
  isRunning: boolean;
  onApplySelectedTargetAiInstruction: () => void;
  onClearTargetSelection: () => void;
  onRemoveCommentCapture: () => void;
}) {
  const { t } = useI18n();
  const canSubmit = Boolean(props.aiInstruction.trim() || props.commentCapture) && !props.isRunning;

  return (
    <aside className="design-codex-panel" aria-label="Codex design chat">
      <div className="design-codex-chat">
        <span>Codex</span>
        <strong>{t("artifact.chatTitle")}</strong>
        <div className="design-chat-thread" role="log" aria-live="polite" aria-label="Design chat messages">
          {props.chatMessages.length ? props.chatMessages.map((message) => (
            <article className={`design-chat-message ${message.role}`} key={message.id}>
              <div className="design-chat-message-meta">
                <span>{message.role === "user" ? "YOU" : "CODEX"}</span>
                {message.isStreaming ? <i>streaming</i> : null}
              </div>
              {message.mentions.length ? (
                <div className="design-chat-mentions compact">
                  {message.mentions.map((mention) => (
                    <span className="design-chat-mention" key={mention}>@{mention}</span>
                  ))}
                </div>
              ) : null}
              {message.hasCommentCapture ? <span className="design-chat-attachment">{t("artifact.annotatedCanvas")}</span> : null}
              {message.content ? <p>{message.content}</p> : <p className="design-chat-stream-placeholder">{t("artifact.responsePending")}</p>}
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
              <p>{t("artifact.ready")}</p>
            </article>
          )}
        </div>
        <div className="design-chat-composer">
          {props.selectedTargets.length ? (
            <div className="design-chat-mentions" aria-label="Selected layer mentions">
              {props.selectedTargets.map((target) => (
                <span className="design-chat-mention" key={target.id}>@{target.label}</span>
              ))}
              <button type="button" className="design-chat-clear" onClick={props.onClearTargetSelection}>{t("common.clear")}</button>
            </div>
          ) : null}
          {props.commentCapture ? (
            <div className="design-comment-chip">
              <span>{t("artifact.annotatedCanvas")}</span>
              <button type="button" onClick={props.onRemoveCommentCapture}>{t("artifact.remove")}</button>
            </div>
          ) : null}
          <Textarea
            value={props.aiInstruction}
            onChange={(event) => props.setAiInstruction(event.target.value)}
            placeholder={t("artifact.placeholder")}
          />
          <Button variant="outline" disabled={!canSubmit} onClick={props.onApplySelectedTargetAiInstruction}>
            <SendHorizontal aria-hidden="true" />
            {t("architect.send")}
          </Button>
        </div>
      </div>
    </aside>
  );
}
