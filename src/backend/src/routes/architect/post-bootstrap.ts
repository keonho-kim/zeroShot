import type { Request, Response } from "express";
import { inferBootstrapRequest, runBootstrap } from "@backend/services/bootstrap-service.js";
import type { BootstrapRequest } from "@backend/types.js";
import { getValidatedProjectRoot } from "../shared/project-root.js";

export async function postArchitectBootstrap(req: Request, res: Response) {
  const body = req.body as {
    projectRoot?: string;
    answers?: Record<string, string>;
    decisions?: Array<{ id: string; section: string; title: string; prompt: string; options: Array<{ id: string; label: string; detail: string; productRequirement: string }> }>;
    request?: BootstrapRequest;
  };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? body.request?.projectRoot ?? ""));
  const request = body.request
    ? { ...body.request, projectRoot }
    : inferBootstrapRequest({
      projectRoot,
      answers: body.answers ?? {},
      decisions: body.decisions ?? []
    });
  res.json(await runBootstrap(request));
}
