import { getAppStorageDatabase } from "@backend/services/app-storage/database";

export async function listStoredSessionProjectRoots(): Promise<string[]> {
  const db = await getAppStorageDatabase();
  const rows = db.query<{ project_root: string }, []>(`
    select project_root from architect_sessions
    union
    select project_root from design_sessions
  `).all();
  return rows.map((row) => row.project_root);
}
