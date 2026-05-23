import type { Request, Response } from "express";
import { saveProjectCodexSettings } from "@backend/config/codex-config.js";
import { getValidatedProjectRoot } from "../shared/project-root.js";

export async function postProjectCodexSettings(req: Request, res: Response) {
  const body = req.body as { projectRoot?: string };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  res.json(await saveProjectCodexSettings(projectRoot));
}
