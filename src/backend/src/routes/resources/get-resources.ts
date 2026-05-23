import type { Request, Response } from "express";
import { listResourceCatalog } from "@backend/services/resource-service";

export async function getResources(_req: Request, res: Response) {
  res.json(await listResourceCatalog());
}
