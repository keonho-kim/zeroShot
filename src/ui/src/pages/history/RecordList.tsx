import { formatWorkflowDate } from "@/entities/workflow-log/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/shared/lib/cn";
import type { WorkflowLogRecordSummary } from "@/types/api";

export function RecordList({
  records,
  selectedRecordId,
  onSelect
}: {
  records: WorkflowLogRecordSummary[];
  selectedRecordId: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <aside className="workflow-record-list">
      {records.map((record) => (
        <button
          type="button"
          key={record.id}
          className={cn("workflow-record-button", selectedRecordId === record.id && "selected")}
          onClick={() => onSelect(record.id)}
        >
          <strong>{record.title}</strong>
          <span>{record.summary}</span>
          <small>{formatWorkflowDate(record.createdAt)}</small>
        </button>
      ))}
      {!records.length ? <p className="history-empty">{t("log.noSectionRecords")}</p> : null}
    </aside>
  );
}
