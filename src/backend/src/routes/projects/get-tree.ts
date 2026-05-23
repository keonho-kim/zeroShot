import type { Request, Response } from "express";
import { loadAppConfig } from "@backend/config/app-config.js";
import { assertPathWithinRoots, listDirectoryEntries } from "@backend/core/path-guards.js";
import { getBrowsableRoots } from "../shared/project-root.js";

export async function getProjectTree(req: Request, res: Response) {
  const config = await loadAppConfig();
  const targetPath = typeof req.query.path === "string" ? req.query.path : "";
  const browsableRoots = getBrowsableRoots(config);

  if (!targetPath) {
    const roots = await Promise.all(
      browsableRoots.map(async (root) => ({
        name: root,
        path: root,
        relativePath: "",
        isDirectory: true,
        isAllowedRoot: config.allowedRoots.includes(root),
        hasWorkHistory: false,
        runsCount: 0
      }))
    );
    res.json({ path: "", entries: roots });
    return;
  }

  const validated = await assertPathWithinRoots(targetPath, browsableRoots, "browsable roots");
  const entries = await listDirectoryEntries(validated, validated, {
    hideHidden: true,
    allowedRoots: config.allowedRoots,
    includeHistoryMeta: false
  });
  res.json({ path: validated, entries });
}
