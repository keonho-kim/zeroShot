import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { getAppDatabasePath } from "@backend/core/workspace";

let database: Database | null = null;

export async function getAppStorageDatabase(): Promise<Database> {
  if (database) {
    return database;
  }

  const path = getAppDatabasePath();
  await mkdir(dirname(path), { recursive: true });
  database = new Database(path);
  database.exec(`
    create table if not exists project_settings (
      project_root text primary key,
      active_skill_id text,
      active_design_template_id text,
      active_design_system_id text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists architect_sessions (
      id text primary key,
      project_root text not null,
      goal text not null,
      title text not null,
      summary text not null,
      decisions_json text not null,
      created_at text not null
    );

    create table if not exists design_sessions (
      id text primary key,
      project_root text not null,
      mode text not null,
      title text not null,
      summary text not null,
      response_json text not null,
      created_at text not null
    );
  `);
  try {
    database.exec("alter table project_settings add column active_design_system_id text;");
  } catch {
    // Existing databases already have this column.
  }
  return database;
}
