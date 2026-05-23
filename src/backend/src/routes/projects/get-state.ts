import type { Request, Response } from "express";
import { readProjectState } from "@backend/services/project-service.js";
import { getValidatedProjectRoot } from "../shared/project-root.js";

export async function getProjectState(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readProjectState(projectRoot));
}
