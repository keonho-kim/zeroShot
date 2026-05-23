import type { Request, Response } from "express";
import { listRuns } from "@backend/services/history-service.js";
import { getValidatedProjectRoot } from "../shared/project-root.js";

export async function getRuns(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json({ runs: await listRuns(projectRoot) });
}
