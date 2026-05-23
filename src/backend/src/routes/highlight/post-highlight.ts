import type { Request, Response } from "express";
import { highlightCode, normalizeHighlightLanguage } from "@backend/services/code-highlighting-service.js";

export async function postHighlight(req: Request, res: Response) {
  const body = req.body as { code?: string; language?: string };
  const code = typeof body.code === "string" ? body.code : "";
  const language = normalizeHighlightLanguage(body.language);

  res.json({ html: await highlightCode(code, language), language });
}
