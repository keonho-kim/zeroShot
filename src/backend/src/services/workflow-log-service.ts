import { Database } from "bun:sqlite";
import { mkdir, readdir } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { dirname, join } from "node:path";
import { getAppDatabasePath } from "@backend/core/workspace.js";
import { architectProductPath, designEntryPath, readArtifactFile, readArtifactManifest } from "@backend/services/file-service.js";
import type {
  WorkflowLogBoard,
  WorkflowLogEvent,
  WorkflowLogRecordDetail,
  WorkflowLogRecordKind,
  WorkflowLogRecordSummary,
  WorkflowLogSection,
  WorkflowLogStage,
  WorkflowLogStageGroup
} from "@backend/types.js";

const stageSections: Record<WorkflowLogStage, WorkflowLogSection[]> = {
  product: ["blueprint", "decisions", "logs"],
  design: ["preview", "decisions", "logs"],
  build: ["decisions", "build-log"],
  update: ["request", "decisions", "update-log"]
};

const stageOrder = Object.keys(stageSections) as WorkflowLogStage[];

let database: Database | null = null;

async function getDatabase(): Promise<Database> {
  if (database) {
    return database;
  }

  const path = getAppDatabasePath();
  await mkdir(dirname(path), { recursive: true });
  database = new Database(path);
  database.exec(`
    create table if not exists workflow_log_records (
      id text primary key,
      project_root text not null,
      stage text not null,
      section text not null,
      kind text not null,
      title text not null,
      summary text not null,
      content_type text,
      payload_json text,
      created_at text not null
    );

    create table if not exists workflow_log_events (
      id text primary key,
      record_id text not null,
      seq integer not null,
      type text not null,
      message text not null,
      payload_json text,
      created_at text not null,
      foreign key (record_id) references workflow_log_records(id) on delete cascade
    );

    create index if not exists idx_workflow_log_records_project
      on workflow_log_records(project_root, stage, section, created_at);

    create index if not exists idx_workflow_log_events_record
      on workflow_log_events(record_id, seq);
  `);
  return database;
}

export function resetWorkflowLogDatabaseForTests(): void {
  database?.close();
  database = null;
}

function parsePayload(raw: string | null): unknown | undefined {
  if (!raw) {
    return undefined;
  }
  return JSON.parse(raw) as unknown;
}

function artifactRecordId(path: string): string {
  return `artifact:${Buffer.from(path).toString("base64url")}`;
}

function decodeArtifactRecordId(id: string): string | null {
  if (!id.startsWith("artifact:")) {
    return null;
  }
  try {
    return Buffer.from(id.slice("artifact:".length), "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function artifactStage(path: string): { stage: WorkflowLogStage; section: WorkflowLogSection } | null {
  if (path === architectProductPath || path.startsWith("ARCHITECT/")) {
    return { stage: "product", section: "blueprint" };
  }
  if (path === designEntryPath || path.startsWith("DESIGN/")) {
    return { stage: "design", section: "preview" };
  }
  return null;
}

function isHtmlArtifact(path: string, type: string): boolean {
  return type === "text/html" || path.toLowerCase().endsWith(".html");
}

async function artifactRecords(projectRoot: string): Promise<WorkflowLogRecordSummary[]> {
  const manifest = await readArtifactManifest(projectRoot);
  const records: WorkflowLogRecordSummary[] = [];
  for (const artifact of manifest.artifacts) {
    if (!isHtmlArtifact(artifact.path, artifact.type)) {
      continue;
    }
    const location = artifactStage(artifact.path);
    if (!location) {
      continue;
    }
    records.push({
      id: artifactRecordId(artifact.path),
      projectRoot,
      stage: location.stage,
      section: location.section,
      kind: "artifact",
      title: artifact.title || artifact.path,
      summary: artifact.path,
      contentType: artifact.type,
      createdAt: artifact.updatedAt || artifact.createdAt,
      eventCount: 0
    });
  }

  const knownPaths = new Set(records.map((record) => record.summary));
  const architectHtmlFiles = await listHtmlFiles(projectRoot, "ARCHITECT");
  const designHtmlFiles = await listHtmlFiles(projectRoot, "DESIGN");
  const fallbackPaths = new Set([
    architectProductPath,
    designEntryPath,
    ...architectHtmlFiles,
    ...designHtmlFiles
  ]);
  for (const path of fallbackPaths) {
    if (knownPaths.has(path)) {
      continue;
    }
    const content = await readArtifactFile(projectRoot, path).catch(() => "");
    const location = artifactStage(path);
    if (!content.trim() || !location) {
      continue;
    }
    records.push({
      id: artifactRecordId(path),
      projectRoot,
      stage: location.stage,
      section: location.section,
      kind: "artifact",
      title: path,
      summary: path,
      contentType: "text/html",
      createdAt: new Date(0).toISOString(),
      eventCount: 0
    });
  }

  return records.sort((a, b) => Number(b.summary === architectProductPath || b.summary === designEntryPath) - Number(a.summary === architectProductPath || a.summary === designEntryPath)
    || b.createdAt.localeCompare(a.createdAt)
    || a.title.localeCompare(b.title));
}

async function listHtmlFiles(projectRoot: string, relativeDir: string): Promise<string[]> {
  const entries = await readdir(join(projectRoot, relativeDir), { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(entries.map(async (entry) => {
    const relativePath = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      return listHtmlFiles(projectRoot, relativePath);
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      return [relativePath];
    }
    return [];
  }));
  return nested.flat();
}

function rowToRecord(row: {
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

async function storedRecords(projectRoot: string): Promise<WorkflowLogRecordSummary[]> {
  const db = await getDatabase();
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
  const db = await getDatabase();
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

export async function appendWorkflowLogEvent(recordId: string, event: {
  type: string;
  message?: string;
  payload?: unknown;
}): Promise<WorkflowLogEvent> {
  const db = await getDatabase();
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

export async function readWorkflowLogBoard(projectRoot: string): Promise<WorkflowLogBoard> {
  const records = [
    ...await artifactRecords(projectRoot),
    ...await storedRecords(projectRoot)
  ];

  const stages: WorkflowLogStageGroup[] = stageOrder.map((stage) => {
    const sections = stageSections[stage].map((section) => {
      const sectionRecords = records
        .filter((record) => record.stage === stage && record.section === section)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return {
        section,
        enabled: sectionRecords.length > 0,
        records: sectionRecords
      };
    });
    return {
      stage,
      enabled: sections.some((section) => section.enabled),
      sections
    };
  });

  return { projectRoot, stages };
}

export async function listWorkflowLogProjectRoots(): Promise<string[]> {
  const db = await getDatabase();
  const rows = db.query<{ project_root: string }, []>(`
    select distinct project_root
    from workflow_log_records
    order by project_root asc
  `).all();
  return rows.map((row) => row.project_root);
}

export async function countWorkflowLogRecords(projectRoot: string): Promise<number> {
  const db = await getDatabase();
  const row = db.query<{ count: number }, [string]>("select count(*) as count from workflow_log_records where project_root = ?").get(projectRoot);
  const artifacts = await artifactRecords(projectRoot);
  return (row?.count ?? 0) + artifacts.length;
}

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

  const db = await getDatabase();
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

  const events = db.query<{
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

  return {
    ...rowToRecord(row),
    ...(row.payload_json ? { payload: parsePayload(row.payload_json) } : {}),
    events
  };
}
