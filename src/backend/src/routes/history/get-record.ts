import type { Request, Response } from "express";
import { readWorkflowLogRecord } from "@backend/services/workflow-log-service.js";
import { getValidatedProjectRoot } from "../shared/project-root.js";

export async function getHistoryRecord(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readWorkflowLogRecord(projectRoot, String(req.params.recordId)));
}
