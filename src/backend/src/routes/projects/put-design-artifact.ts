import type { Request, Response } from "express";
import { appendAppEvent } from "@backend/services/event-log/service";
import { upsertArtifactManifest, writeDesignHtmlSnapshot } from "@backend/services/file/service";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";

export async function putDesignArtifact(req: Request, res: Response) {
  const body = req.body as { projectRoot: string; content?: string; etag?: string };
  const projectRoot = await getValidatedProjectRoot(body.projectRoot);
  if (typeof body.content !== "string" || !body.content.trim()) {
    res.status(400).json({ message: "Design artifact content is required" });
    return;
  }

  try {
    const file = await writeDesignHtmlSnapshot(projectRoot, body.content, body.etag);
    await upsertArtifactManifest(projectRoot, [{
      path: file.path,
      type: "text/html",
      title: "DESIGN",
      entry: true
    }]);
    await appendAppEvent("design_artifact_saved", {
      projectRoot,
      path: file.path,
      etag: file.etag
    });
    res.json(file);
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    res.status(err.statusCode ?? 500).json({ message: err.message });
  }
}
