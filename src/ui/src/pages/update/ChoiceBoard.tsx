import { useI18n } from "@/lib/i18n";
import type { UpdateDecision, UpdateDecisionOption } from "@/types/api";

export function ChoiceBoard({
  decisionsCount,
  answersCount,
  pinnedChoices,
  updateContent
}: {
  decisionsCount: number;
  answersCount: number;
  pinnedChoices: Array<{ decision: UpdateDecision; option: UpdateDecisionOption | null }>;
  updateContent: string;
}) {
  const { t } = useI18n();
  return (
    <aside className="architect-choice-board update-choice-board" aria-label={t("update.choiceBoard")}>
      <div className="choice-board-heading">
        <strong>{t("update.choiceBoard")}</strong>
        <span>{answersCount} / {decisionsCount || 0}</span>
      </div>
      <div className="pinned-choice-list">
        <article className="pinned-choice-note idea">
          <span>{t("common.request")}</span>
          <strong>{updateContent || t("update.requestEmpty")}</strong>
        </article>
        {pinnedChoices.map(({ decision, option }, index) => (
          <article className="pinned-choice-note" key={decision.id} style={{ ["--pin-index" as string]: index + 1 }}>
            <span>{decision.title}</span>
            <strong>{option?.label}</strong>
            <p>{option?.detail}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
