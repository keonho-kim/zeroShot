import type { Request, Response } from "express";
import { readRunDetail } from "@backend/services/history-service";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";

export async function getRunDetail(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readRunDetail(projectRoot, String(req.params.runName)));
}
