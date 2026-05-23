import type { Request, Response } from "express";
import { readWorkflowLogRecord } from "@backend/services/workflow-log/service";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";

export async function getHistoryRecord(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readWorkflowLogRecord(projectRoot, String(req.params.recordId)));
}
