import type { Request, Response } from "express";
import { saveCodexSettings } from "@backend/config/codex-config.js";

export async function putCodexSettings(req: Request, res: Response) {
  await saveCodexSettings(req.body);
  res.status(204).end();
}
