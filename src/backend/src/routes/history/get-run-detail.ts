import type { Request, Response } from "express";
import { readRunDetail } from "@backend/services/history-service.js";
import { getValidatedProjectRoot } from "../shared/project-root.js";

export async function getRunDetail(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readRunDetail(projectRoot, String(req.params.runName)));
}
