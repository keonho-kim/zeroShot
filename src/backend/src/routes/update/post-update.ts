import type { Request, Response } from "express";
import { startPipeline } from "../pipeline/start-pipeline.js";

export async function postUpdate(req: Request, res: Response) {
  await startPipeline("update", req, res);
}
