import type { Request, Response } from "express";
import { loadAppConfig, saveAppConfig } from "@backend/config/app-config.js";
import { assertPathWithinRoots, isWithin } from "@backend/core/path-guards.js";
import { deleteEntry } from "@backend/services/file-service.js";
import { getBrowsableRoots } from "../shared/project-root.js";

export async function deleteProjectDirectory(req: Request, res: Response) {
  const body = req.body as { path?: string };
  if (typeof body.path !== "string" || !body.path.trim()) {
    res.status(400).json({ message: "path is required" });
    return;
  }

  const config = await loadAppConfig();
  const browsableRoots = getBrowsableRoots(config);
  const validated = await assertPathWithinRoots(body.path, browsableRoots, "browsable roots");

  if (config.bootstrapRoots.includes(validated)) {
    res.status(400).json({ message: "Cannot delete the home directory root" });
    return;
  }

  await deleteEntry(validated);

  const nextAllowedRoots = config.allowedRoots.filter((root) => !isWithin(validated, root));
  if (nextAllowedRoots.length !== config.allowedRoots.length) {
    await saveAppConfig({
      ...config,
      allowedRoots: nextAllowedRoots
    });
  }

  res.status(204).end();
}
