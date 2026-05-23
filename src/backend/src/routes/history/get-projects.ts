import type { Request, Response } from "express";
import { listWorkLogProjects } from "@backend/services/log-service.js";

export async function getHistoryProjects(_req: Request, res: Response) {
  res.json({ projects: await listWorkLogProjects() });
}
