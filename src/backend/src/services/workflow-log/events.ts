import { getWorkflowLogDatabase } from "@backend/services/workflow-log/database";
import { parsePayload } from "@backend/services/workflow-log/payload";
import type { WorkflowLogEvent } from "@backend/types/history";

export async function appendWorkflowLogEvent(recordId: string, event: {
  type: string;
  message?: string;
  payload?: unknown;
}): Promise<WorkflowLogEvent> {
  const db = await getWorkflowLogDatabase();
  const row = db.query<{ seq: number | null }, [string]>("select max(seq) as seq from workflow_log_events where record_id = ?").get(recordId);
  const seq = (row?.seq ?? 0) + 1;
  const createdAt = new Date().toISOString();
  const id = crypto.randomUUID();
  db.query(`
    insert into workflow_log_events (
      id,
      record_id,
      seq,
      type,
      message,
      payload_json,
      created_at
    )
    values (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    recordId,
    seq,
    event.type,
    event.message ?? "",
    event.payload === undefined ? null : JSON.stringify(event.payload),
    createdAt
  );

  return {
    id,
    recordId,
    seq,
    type: event.type,
    message: event.message ?? "",
    ...(event.payload === undefined ? {} : { payload: event.payload }),
    createdAt
  };
}

export async function listWorkflowLogEvents(recordId: string): Promise<WorkflowLogEvent[]> {
  const db = await getWorkflowLogDatabase();
  return db.query<{
    id: string;
    record_id: string;
    seq: number;
    type: string;
    message: string;
    payload_json: string | null;
    created_at: string;
  }, [string]>(`
    select id, record_id, seq, type, message, payload_json, created_at
    from workflow_log_events
    where record_id = ?
    order by seq asc
  `).all(recordId).map((event) => ({
    id: event.id,
    recordId: event.record_id,
    seq: event.seq,
    type: event.type,
    message: event.message,
    ...(event.payload_json ? { payload: parsePayload(event.payload_json) } : {}),
    createdAt: event.created_at
  }));
}
