import type { Request, Response } from "express";
import { readWorkflowLogBoard } from "@backend/services/workflow-log/service";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";

export async function getHistoryBoard(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readWorkflowLogBoard(projectRoot));
}
