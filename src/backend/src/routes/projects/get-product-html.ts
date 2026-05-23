import type { Request, Response } from "express";
import { readProductHtml } from "@backend/services/file-service.js";
import { getValidatedProjectRoot } from "../shared/project-root.js";

export async function getProductHtml(req: Request, res: Response) {
  const projectRoot = await getValidatedProjectRoot(String(req.query.projectRoot ?? ""));
  res.type("html").send(await readProductHtml(projectRoot));
}
