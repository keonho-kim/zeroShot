import type { Request, Response } from "express";
import { loadCodexSettings } from "@backend/config/codex-config.js";

export async function getCodexSettings(_req: Request, res: Response) {
  res.json((await loadCodexSettings()).settings);
}
