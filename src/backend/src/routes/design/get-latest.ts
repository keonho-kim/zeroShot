import type { Request, Response } from "express";
import { readLatestDesignSession } from "@backend/services/app-storage-service.js";
import { getValidatedProjectRoot } from "../shared/project-root.js";

export async function getLatestDesign(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readLatestDesignSession(projectRoot));
}
