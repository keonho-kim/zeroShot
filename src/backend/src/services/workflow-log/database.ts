import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { getAppDatabasePath } from "@backend/core/workspace";

let database: Database | null = null;

export async function getWorkflowLogDatabase(): Promise<Database> {
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
