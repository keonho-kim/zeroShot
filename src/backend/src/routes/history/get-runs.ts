import type { Request, Response } from "express";
import { listRuns } from "@backend/services/history/service";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";

export async function getRuns(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json({ runs: await listRuns(projectRoot) });
}
