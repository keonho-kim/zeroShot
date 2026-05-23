import { readArtifactFile } from "@backend/services/file/service";
import { artifactRecords, artifactStage, decodeArtifactRecordId } from "@backend/services/workflow-log/artifact-records";
import { getWorkflowLogDatabase } from "@backend/services/workflow-log/database";
import { listWorkflowLogEvents } from "@backend/services/workflow-log/events";
import { parsePayload } from "@backend/services/workflow-log/payload";
import { rowToRecord } from "@backend/services/workflow-log/records";
import type { WorkflowLogRecordDetail } from "@backend/types/history";

export async function readWorkflowLogRecord(projectRoot: string, recordId: string): Promise<WorkflowLogRecordDetail> {
  const artifactPath = decodeArtifactRecordId(recordId);
  if (artifactPath) {
    const content = await readArtifactFile(projectRoot, artifactPath);
    const record = (await artifactRecords(projectRoot)).find((item) => item.id === recordId);
    const location = artifactStage(artifactPath);
    if (!location) {
      throw Object.assign(new Error("Workflow log record not found."), { statusCode: 404 });
    }
    return {
      id: recordId,
      projectRoot,
      stage: location.stage,
      section: location.section,
      kind: "artifact",
      title: record?.title ?? artifactPath,
      summary: artifactPath,
      contentType: record?.contentType ?? "text/html",
      createdAt: record?.createdAt ?? new Date(0).toISOString(),
      eventCount: 0,
      content,
      events: []
    };
  }

  const db = await getWorkflowLogDatabase();
  const row = db.query<{
    id: string;
    project_root: string;
    stage: string;
    section: string;
    kind: string;
    title: string;
    summary: string;
    content_type: string | null;
    payload_json: string | null;
    created_at: string;
    event_count: number;
  }, [string, string]>(`
    select
      records.id,
      records.project_root,
      records.stage,
      records.section,
      records.kind,
      records.title,
      records.summary,
      records.content_type,
      records.payload_json,
      records.created_at,
      count(events.id) as event_count
    from workflow_log_records records
    left join workflow_log_events events on events.record_id = records.id
    where records.project_root = ? and records.id = ?
    group by records.id
  `).get(projectRoot, recordId);

  if (!row) {
    throw Object.assign(new Error("Workflow log record not found."), { statusCode: 404 });
  }

  return {
    ...rowToRecord(row),
    ...(row.payload_json ? { payload: parsePayload(row.payload_json) } : {}),
    events: await listWorkflowLogEvents(recordId)
  };
}
