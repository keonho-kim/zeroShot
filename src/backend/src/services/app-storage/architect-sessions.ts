import { getAppStorageDatabase } from "@backend/services/app-storage/database";
import type { StoredArchitectSession } from "@backend/services/app-storage/types";

export async function recordArchitectSession(params: {
  projectRoot: string;
  goal: string;
  title: string;
  summary: string;
  decisions: unknown;
}): Promise<void> {
  const db = await getAppStorageDatabase();
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

export async function listStoredArchitectSessions(projectRoot: string): Promise<StoredArchitectSession[]> {
  const db = await getAppStorageDatabase();
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
