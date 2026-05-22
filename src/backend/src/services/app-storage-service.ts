import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { getAppDatabasePath } from "@backend/core/workspace.js";
import type { DesignRuntimeResponse, ProjectSettings } from "@backend/types.js";

let database: Database | null = null;

export interface StoredArchitectSession {
  id: string;
  projectRoot: string;
  goal: string;
  title: string;
  summary: string;
  decisionsJson: string;
  createdAt: string;
}

export interface StoredDesignSession {
  id: string;
  projectRoot: string;
  mode: string;
  title: string;
  summary: string;
  responseJson: string;
  createdAt: string;
}

async function getDatabase(): Promise<Database> {
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

export async function readProjectSettings(projectRoot: string): Promise<ProjectSettings> {
  const db = await getDatabase();
  const row = db.query<{
    project_root: string;
    active_skill_id: string | null;
    active_design_template_id: string | null;
    active_design_system_id: string | null;
  }, [string]>(`
    select project_root, active_skill_id, active_design_template_id, active_design_system_id
    from project_settings
    where project_root = ?
  `).get(projectRoot);

  return {
    projectRoot,
    activeSkillId: row?.active_skill_id ?? undefined,
    activeDesignTemplateId: row?.active_design_template_id ?? undefined,
    activeDesignSystemId: row?.active_design_system_id ?? undefined
  };
}

export async function saveProjectSettings(settings: ProjectSettings): Promise<ProjectSettings> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  db.query(`
    insert into project_settings (
      project_root,
      active_skill_id,
      active_design_template_id,
      active_design_system_id,
      created_at,
      updated_at
    )
    values (?, ?, ?, ?, ?, ?)
    on conflict(project_root) do update set
      active_skill_id = excluded.active_skill_id,
      active_design_template_id = excluded.active_design_template_id,
      active_design_system_id = excluded.active_design_system_id,
      updated_at = excluded.updated_at
  `).run(
    settings.projectRoot,
    settings.activeSkillId ?? null,
    settings.activeDesignTemplateId ?? null,
    settings.activeDesignSystemId ?? null,
    now,
    now
  );
  return readProjectSettings(settings.projectRoot);
}

export async function recordArchitectSession(params: {
  projectRoot: string;
  goal: string;
  title: string;
  summary: string;
  decisions: unknown;
}): Promise<void> {
  const db = await getDatabase();
  db.query(`
    insert into architect_sessions (
      id,
      project_root,
      goal,
      title,
      summary,
      decisions_json,
      created_at
    )
    values (?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    params.projectRoot,
    params.goal,
    params.title,
    params.summary,
    JSON.stringify(params.decisions),
    new Date().toISOString()
  );
}

export async function recordDesignSession(response: DesignRuntimeResponse): Promise<void> {
  const db = await getDatabase();
  db.query(`
    insert into design_sessions (
      id,
      project_root,
      mode,
      title,
      summary,
      response_json,
      created_at
    )
    values (?, ?, ?, ?, ?, ?, ?)
  `).run(
    response.id,
    response.projectRoot,
    response.mode,
    response.title,
    response.summary,
    JSON.stringify(response),
    response.generatedAt
  );
}

export async function readLatestDesignSession(projectRoot: string): Promise<DesignRuntimeResponse | null> {
  const db = await getDatabase();
  const row = db.query<{ response_json: string }, [string]>(`
    select response_json
    from design_sessions
    where project_root = ?
    order by created_at desc
    limit 1
  `).get(projectRoot);

  return row ? JSON.parse(row.response_json) as DesignRuntimeResponse : null;
}

export async function listStoredSessionProjectRoots(): Promise<string[]> {
  const db = await getDatabase();
  const rows = db.query<{ project_root: string }, []>(`
    select project_root from architect_sessions
    union
    select project_root from design_sessions
  `).all();
  return rows.map((row) => row.project_root);
}

export async function listStoredArchitectSessions(projectRoot: string): Promise<StoredArchitectSession[]> {
  const db = await getDatabase();
  return db.query<{
    id: string;
    project_root: string;
    goal: string;
    title: string;
    summary: string;
    decisions_json: string;
    created_at: string;
  }, [string]>(`
    select id, project_root, goal, title, summary, decisions_json, created_at
    from architect_sessions
    where project_root = ?
    order by created_at desc
  `).all(projectRoot).map((row) => ({
    id: row.id,
    projectRoot: row.project_root,
    goal: row.goal,
    title: row.title,
    summary: row.summary,
    decisionsJson: row.decisions_json,
    createdAt: row.created_at
  }));
}

export async function listStoredDesignSessions(projectRoot: string): Promise<StoredDesignSession[]> {
  const db = await getDatabase();
  return db.query<{
    id: string;
    project_root: string;
    mode: string;
    title: string;
    summary: string;
    response_json: string;
    created_at: string;
  }, [string]>(`
    select id, project_root, mode, title, summary, response_json, created_at
    from design_sessions
    where project_root = ?
    order by created_at desc
  `).all(projectRoot).map((row) => ({
    id: row.id,
    projectRoot: row.project_root,
    mode: row.mode,
    title: row.title,
    summary: row.summary,
    responseJson: row.response_json,
    createdAt: row.created_at
  }));
}
