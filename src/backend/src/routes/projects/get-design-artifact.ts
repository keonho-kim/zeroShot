import type { Request, Response } from "express";
import { readDesignHtmlSnapshot } from "@backend/services/file-service.js";
import { getValidatedProjectRoot } from "../shared/project-root.js";

export async function getDesignArtifact(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readDesignHtmlSnapshot(projectRoot));
}
