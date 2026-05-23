import type { Request, Response } from "express";
import { readProjectSettings } from "@backend/services/app-storage/service";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";

export async function getProjectSettings(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readProjectSettings(projectRoot));
}
