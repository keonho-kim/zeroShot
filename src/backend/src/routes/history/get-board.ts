import type { Request, Response } from "express";
import { readWorkflowLogBoard } from "@backend/services/workflow-log-service.js";
import { getValidatedProjectRoot } from "../shared/project-root.js";

export async function getHistoryBoard(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readWorkflowLogBoard(projectRoot));
}
