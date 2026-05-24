import type { Request, Response } from "express";
import { startPipeline } from "@backend/routes/pipeline/start-pipeline";

export async function postUpdate(req: Request, res: Response) {
  await startPipeline("update", req, res);
}
