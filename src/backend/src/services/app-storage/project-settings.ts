import { getAppStorageDatabase } from "@backend/services/app-storage/database";
import type { ProjectSettings } from "@backend/types/project";

export async function readProjectSettings(projectRoot: string): Promise<ProjectSettings> {
  const db = await getAppStorageDatabase();
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
  const db = await getAppStorageDatabase();
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
