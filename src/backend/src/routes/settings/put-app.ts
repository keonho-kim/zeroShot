import type { Request, Response } from "express";
import { saveAppConfig } from "@backend/config/app-config.js";

export async function putAppSettings(req: Request, res: Response) {
  await saveAppConfig(req.body);
  res.status(204).end();
}
