import type { Request, Response } from "express";
import { readProjectState } from "@backend/services/project/service";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";

export async function getProjectState(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readProjectState(projectRoot));
}
