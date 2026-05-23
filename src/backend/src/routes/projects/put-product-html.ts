import type { Request, Response } from "express";
import { appendAppEvent } from "@backend/services/event-log-service.js";
import { upsertArtifactManifest, writeProductHtml } from "@backend/services/file-service.js";
import { getValidatedProjectRoot } from "../shared/project-root.js";

export async function putProductHtml(req: Request, res: Response) {
  const body = req.body as { projectRoot: string; content?: string; markdownMirror?: string };
  const projectRoot = await getValidatedProjectRoot(body.projectRoot);
  if (typeof body.content !== "string" || !body.content.trim()) {
    res.status(400).json({ message: "PRODUCT.html content is required" });
    return;
  }

  await writeProductHtml(projectRoot, body.content);
  await upsertArtifactManifest(projectRoot, [{
    path: "ARCHITECT/PRODUCT.html",
    type: "text/html",
    title: "ARCHITECT/PRODUCT.html",
    entry: true
  }]);
  await appendAppEvent("product_html_saved", { projectRoot });
  res.status(204).end();
}
