import { getAppStorageDatabase } from "@backend/services/app-storage/database";
import type { StoredDesignSession } from "@backend/services/app-storage/types";
import type { DesignRuntimeResponse } from "@backend/types/design";

export async function recordDesignSession(response: DesignRuntimeResponse): Promise<void> {
  const db = await getAppStorageDatabase();
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
  const db = await getAppStorageDatabase();
  const row = db.query<{ response_json: string }, [string]>(`
    select response_json
    from design_sessions
    where project_root = ?
    order by created_at desc
    limit 1
  `).get(projectRoot);

  return row ? JSON.parse(row.response_json) as DesignRuntimeResponse : null;
}

export async function listStoredDesignSessions(projectRoot: string): Promise<StoredDesignSession[]> {
  const db = await getAppStorageDatabase();
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
