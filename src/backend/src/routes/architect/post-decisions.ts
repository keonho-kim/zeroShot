import type { Request, Response } from "express";
import { normalizeLocale } from "@backend/i18n/locale.js";
import { buildArchitectDecisions } from "@backend/services/architect-service.js";
import { readAuthStatus } from "@backend/services/auth-service.js";
import { recordArchitectSession } from "@backend/services/app-storage-service.js";
import { loadAppConfig } from "@backend/config/app-config.js";
import { appendAppEvent } from "@backend/services/event-log-service.js";
import { buildResourcePromptContext } from "@backend/services/resource-service.js";
import { getValidatedProjectRoot } from "../shared/project-root.js";

export async function postArchitectDecisions(req: Request, res: Response) {
  const auth = await readAuthStatus();
  if (!auth.valid) {
    res.status(412).json(auth);
    return;
  }

  const body = req.body as {
    projectRoot?: string;
    goal?: string;
    locale?: string;
    model?: string;
    activeSkillId?: string;
    activeDesignTemplateId?: string;
    activeDesignSystemId?: string;
  };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  if (typeof body.goal !== "string" || !body.goal.trim()) {
    res.status(400).json({ message: "Architect goal is required" });
    return;
  }

  try {
    const appConfig = await loadAppConfig();
    const decisions = await buildArchitectDecisions({
      projectRoot,
      goal: body.goal.trim(),
      locale: normalizeLocale(body.locale),
      reasoning: appConfig.defaults.planReasoning,
      model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : undefined,
      additionalDirectories: [appConfig.resourceRoots.skills, appConfig.resourceRoots.designTemplates, appConfig.resourceRoots.designSystems],
      resourceContext: await buildResourcePromptContext({
        activeSkillId: body.activeSkillId,
        activeDesignTemplateId: body.activeDesignTemplateId,
        activeDesignSystemId: body.activeDesignSystemId,
        includeCatalogSummary: true
      })
    });
    await recordArchitectSession({
      projectRoot,
      goal: body.goal.trim(),
      title: decisions.title,
      summary: decisions.summary,
      decisions
    });
    await appendAppEvent("architect_decisions_created", {
      projectRoot,
      title: decisions.title,
      decisionsCount: decisions.decisions.length
    });
    res.json(decisions);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(502).json({ message: `Codex could not produce architect decisions: ${message}` });
  }
}
