import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { getAppDatabasePath } from "@backend/core/workspace.js";
import type { DesignRuntimeResponse, ProjectSettings } from "@backend/types.js";

let database: Database | null = null;

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
  return database;
}

export async function readProjectSettings(projectRoot: string): Promise<ProjectSettings> {
  const db = await getDatabase();
  const row = db.query<{
    project_root: string;
    active_skill_id: string | null;
    active_design_template_id: string | null;
  }, [string]>(`
    select project_root, active_skill_id, active_design_template_id
    from project_settings
    where project_root = ?
  `).get(projectRoot);

  return {
    projectRoot,
    activeSkillId: row?.active_skill_id ?? undefined,
    activeDesignTemplateId: row?.active_design_template_id ?? undefined
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
      created_at,
      updated_at
    )
    values (?, ?, ?, ?, ?)
    on conflict(project_root) do update set
      active_skill_id = excluded.active_skill_id,
      active_design_template_id = excluded.active_design_template_id,
      updated_at = excluded.updated_at
  `).run(
    settings.projectRoot,
    settings.activeSkillId ?? null,
    settings.activeDesignTemplateId ?? null,
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
