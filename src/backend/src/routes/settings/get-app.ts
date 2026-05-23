import type { Request, Response } from "express";
import { loadAppConfig } from "@backend/config/app-config";

export async function getAppSettings(_req: Request, res: Response) {
  res.json(await loadAppConfig());
}
