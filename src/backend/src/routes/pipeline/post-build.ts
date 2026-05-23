import type { Request, Response } from "express";
import { startPipeline } from "./start-pipeline.js";

export async function postBuild(req: Request, res: Response) {
  await startPipeline("build", req, res);
}
