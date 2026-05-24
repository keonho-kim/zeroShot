import { useI18n } from "@/lib/i18n";
import { selectedWorkflowAnswerLabel, formatWorkflowDate } from "@/entities/workflow-log/format";
import { DocumentPreview } from "@/shared/ui/DocumentPreview";
import type { WorkflowLogRecordDetail } from "@/types/api";

function DecisionView({ record }: { record: WorkflowLogRecordDetail }) {
  const payload = record.payload as {
    decisionSet?: {
      decisions?: Array<{
        id: string;
        title: string;
        prompt?: string;
        section?: string;
        options: Array<{ id: string; label: string; detail: string; productRequirement: string }>;
      }>;
    };
  } | undefined;
  const decisions = payload?.decisionSet?.decisions ?? [];

  if (!decisions.length) {
    return (
      <div className="workflow-json-panel">
        <pre>{JSON.stringify(record.payload ?? {}, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className="workflow-decision-list">
      {decisions.map((decision) => {
        const answerId = selectedWorkflowAnswerLabel(record.payload, decision.id);
        const option = decision.options.find((candidate) => candidate.id === answerId) ?? decision.options[0];
        return (
          <article className="workflow-decision-card" key={decision.id}>
            <span>{decision.section}</span>
            <h3>{decision.title}</h3>
            {decision.prompt ? <p>{decision.prompt}</p> : null}
            {option ? (
              <div>
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
                <p>{option.productRequirement}</p>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function RequestView({ record }: { record: WorkflowLogRecordDetail }) {
  const payload = record.payload as { request?: string } | undefined;
  return (
    <div className="workflow-request-panel">
      <pre>{payload?.request ?? record.summary}</pre>
    </div>
  );
}

function EventsView({ record }: { record: WorkflowLogRecordDetail }) {
  const { t } = useI18n();
  return (
    <div className="workflow-event-list">
      {record.events.map((event) => (
        <article className="workflow-event-row" key={event.id}>
          <span>{event.seq}</span>
          <div>
            <strong>{event.type}</strong>
            <p>{event.message || JSON.stringify(event.payload ?? {})}</p>
          </div>
          <time>{formatWorkflowDate(event.createdAt)}</time>
        </article>
      ))}
      {!record.events.length ? <p className="history-empty">{t("log.noEventLogs")}</p> : null}
    </div>
  );
}

export function RecordDetail({ record }: { record: WorkflowLogRecordDetail | undefined }) {
  const { t } = useI18n();
  if (!record) {
    return <div className="history-empty history-detail-empty">{t("log.selectRecord")}</div>;
  }
  if (record.kind === "artifact" && record.content?.trim()) {
    return <DocumentPreview className="history-document-frame" filename={record.summary} content={record.content} />;
  }
  if (record.kind === "decisions" || record.section === "decisions") {
    return <DecisionView record={record} />;
  }
  if (record.kind === "request" || record.section === "request") {
    return <RequestView record={record} />;
  }
  return <EventsView record={record} />;
}
