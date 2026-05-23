import type { Request, Response } from "express";
import { readProjectCodexSettings } from "@backend/config/codex-config.js";
import { getValidatedProjectRoot } from "../shared/project-root.js";

export async function getProjectCodexSettings(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readProjectCodexSettings(projectRoot));
}
