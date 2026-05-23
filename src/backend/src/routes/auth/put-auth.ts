import type { Request, Response } from "express";
import { saveAuthFile } from "@backend/services/auth-service.js";

export async function putAuth(req: Request, res: Response) {
  const body = req.body as { content?: string };
  if (typeof body.content !== "string" || !body.content.trim()) {
    res.status(400).json({ message: "auth.json content is required" });
    return;
  }

  try {
    const status = await saveAuthFile(body.content);
    res.json(status);
  } catch {
    res.status(400).json({ message: "auth.json must be valid JSON" });
  }
}
