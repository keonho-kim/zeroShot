import type { Request, Response } from "express";
import { loadAppConfig } from "@backend/config/app-config.js";
import { assertPathWithinRoots } from "@backend/core/path-guards.js";
import { createDirectory } from "@backend/services/file-service.js";
import { buildDirectoryEntry } from "../shared/directory-entry.js";
import { getBrowsableRoots } from "../shared/project-root.js";

export async function postProjectDirectory(req: Request, res: Response) {
  const body = req.body as { parentPath?: string; name?: string };
  if (typeof body.parentPath !== "string" || !body.parentPath.trim()) {
    res.status(400).json({ message: "parentPath is required" });
    return;
  }
  if (typeof body.name !== "string" || !body.name.trim()) {
    res.status(400).json({ message: "name is required" });
    return;
  }

  const config = await loadAppConfig();
  const validatedParent = await assertPathWithinRoots(body.parentPath, getBrowsableRoots(config), "browsable roots");

  try {
    const createdPath = await createDirectory(validatedParent, body.name.trim());
    res.status(201).json(await buildDirectoryEntry(validatedParent, createdPath, config.allowedRoots));
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { statusCode?: number };
    if (err.code === "EEXIST") {
      res.status(409).json({ message: "Directory already exists" });
      return;
    }
    res.status(err.statusCode ?? 500).json({ message: err.message });
  }
}
