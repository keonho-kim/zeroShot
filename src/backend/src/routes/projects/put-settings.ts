import type { Request, Response } from "express";
import { saveProjectSettings } from "@backend/services/app-storage-service";
import { appendAppEvent } from "@backend/services/event-log-service";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";

export async function putProjectSettings(req: Request, res: Response) {
  const body = req.body as { projectRoot?: string; activeSkillId?: string; activeDesignTemplateId?: string; activeDesignSystemId?: string };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  const settings = await saveProjectSettings({
    projectRoot,
    activeSkillId: typeof body.activeSkillId === "string" && body.activeSkillId ? body.activeSkillId : undefined,
    activeDesignTemplateId: typeof body.activeDesignTemplateId === "string" && body.activeDesignTemplateId ? body.activeDesignTemplateId : undefined,
    activeDesignSystemId: typeof body.activeDesignSystemId === "string" && body.activeDesignSystemId ? body.activeDesignSystemId : undefined
  });
  await appendAppEvent("project_settings_saved", {
    projectRoot,
    activeSkillId: settings.activeSkillId ?? null,
    activeDesignTemplateId: settings.activeDesignTemplateId ?? null,
    activeDesignSystemId: settings.activeDesignSystemId ?? null
  });
  res.json(settings);
}
