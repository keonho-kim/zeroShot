import type { Request, Response } from "express";
import { readLatestDesignSession } from "@backend/services/app-storage-service";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";

export async function getLatestDesign(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readLatestDesignSession(projectRoot));
}
