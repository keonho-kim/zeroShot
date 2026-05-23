import type { Request, Response } from "express";
import { jobManager } from "@backend/services/job-manager.js";

export async function getCurrentJob(_req: Request, res: Response) {
  res.json(jobManager.getCurrentJob());
}
