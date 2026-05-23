import type { Request, Response } from "express";
import { startPipeline } from "@backend/routes/pipeline/start-pipeline";

export async function postBuild(req: Request, res: Response) {
  await startPipeline("build", req, res);
}
