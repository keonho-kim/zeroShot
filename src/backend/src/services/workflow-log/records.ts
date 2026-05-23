import { artifactRecords } from "@backend/services/workflow-log/artifact-records";
import { getWorkflowLogDatabase } from "@backend/services/workflow-log/database";
import type {
  WorkflowLogRecordKind,
  WorkflowLogRecordSummary,
  WorkflowLogSection,
  WorkflowLogStage
} from "@backend/types/history";

export function rowToRecord(row: {
  id: string;
  project_root: string;
  stage: string;
  section: string;
  kind: string;
  title: string;
  summary: string;
  content_type: string | null;
  created_at: string;
  event_count: number;
}): WorkflowLogRecordSummary {
  return {
    id: row.id,
    projectRoot: row.project_root,
    stage: row.stage as WorkflowLogStage,
    section: row.section as WorkflowLogSection,
    kind: row.kind as WorkflowLogRecordKind,
    title: row.title,
    summary: row.summary,
    ...(row.content_type ? { contentType: row.content_type } : {}),
    createdAt: row.created_at,
    eventCount: row.event_count
  };
}

export async function storedRecords(projectRoot: string): Promise<WorkflowLogRecordSummary[]> {
  const db = await getWorkflowLogDatabase();
  return db.query<{
    id: string;
    project_root: string;
    stage: string;
    section: string;
    kind: string;
    title: string;
    summary: string;
    content_type: string | null;
    created_at: string;
    event_count: number;
  }, [string]>(`
    select
      records.id,
      records.project_root,
      records.stage,
      records.section,
      records.kind,
      records.title,
      records.summary,
      records.content_type,
      records.created_at,
      count(events.id) as event_count
    from workflow_log_records records
    left join workflow_log_events events on events.record_id = records.id
    where records.project_root = ?
    group by records.id
    order by records.created_at desc, records.rowid desc
  `).all(projectRoot).map(rowToRecord);
}

export async function createWorkflowLogRecord(params: {
  projectRoot: string;
  stage: WorkflowLogStage;
  section: WorkflowLogSection;
  kind: WorkflowLogRecordKind;
  title: string;
  summary?: string;
  contentType?: string;
  payload?: unknown;
}): Promise<WorkflowLogRecordSummary> {
  const db = await getWorkflowLogDatabase();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.query(`
    insert into workflow_log_records (
      id,
      project_root,
      stage,
      section,
      kind,
      title,
      summary,
      content_type,
      payload_json,
      created_at
    )
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.projectRoot,
    params.stage,
    params.section,
    params.kind,
    params.title,
    params.summary ?? "",
    params.contentType ?? null,
    params.payload === undefined ? null : JSON.stringify(params.payload),
    createdAt
  );

  return {
    id,
    projectRoot: params.projectRoot,
    stage: params.stage,
    section: params.section,
    kind: params.kind,
    title: params.title,
    summary: params.summary ?? "",
    ...(params.contentType ? { contentType: params.contentType } : {}),
    createdAt,
    eventCount: 0
  };
}

export async function listWorkflowLogProjectRoots(): Promise<string[]> {
  const db = await getWorkflowLogDatabase();
  const rows = db.query<{ project_root: string }, []>(`
    select distinct project_root
    from workflow_log_records
    order by project_root asc
  `).all();
  return rows.map((row) => row.project_root);
}

export async function countWorkflowLogRecords(projectRoot: string): Promise<number> {
  const db = await getWorkflowLogDatabase();
  const row = db.query<{ count: number }, [string]>("select count(*) as count from workflow_log_records where project_root = ?").get(projectRoot);
  const artifacts = await artifactRecords(projectRoot);
  return (row?.count ?? 0) + artifacts.length;
}
