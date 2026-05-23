import type { Request, Response } from "express";
import { loadAppConfig, saveAppConfig } from "@backend/config/app-config.js";
import { assertPathWithinRoots } from "@backend/core/path-guards.js";

export async function postAllowProject(req: Request, res: Response) {
  const body = req.body as { path?: string };
  if (typeof body.path !== "string" || !body.path.trim()) {
    res.status(400).json({ message: "path is required" });
    return;
  }

  const config = await loadAppConfig();
  const validated = await assertPathWithinRoots(body.path, config.bootstrapRoots, "home directory");
  const nextAllowedRoots = Array.from(new Set([...config.allowedRoots, validated]));

  const nextConfig = {
    ...config,
    allowedRoots: nextAllowedRoots
  };

  await saveAppConfig(nextConfig);
  res.json(nextConfig);
}
