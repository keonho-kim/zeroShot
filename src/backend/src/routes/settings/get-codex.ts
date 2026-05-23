import type { Request, Response } from "express";
import { loadCodexSettings } from "@backend/config/codex-config";

export async function getCodexSettings(_req: Request, res: Response) {
  res.json((await loadCodexSettings()).settings);
}
