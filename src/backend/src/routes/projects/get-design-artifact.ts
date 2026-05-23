import type { Request, Response } from "express";
import { readDesignHtmlSnapshot } from "@backend/services/file-service";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";

export async function getDesignArtifact(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.json(await readDesignHtmlSnapshot(projectRoot));
}
