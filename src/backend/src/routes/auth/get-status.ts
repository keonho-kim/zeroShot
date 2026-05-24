import type { Request, Response } from "express";
import { readAuthStatus } from "@backend/services/auth/service";

export async function getAuthStatus(_req: Request, res: Response) {
  res.json(await readAuthStatus());
}
