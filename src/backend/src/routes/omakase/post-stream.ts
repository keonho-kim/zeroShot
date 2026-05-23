import type { Request, Response } from "express";
import { createSseStream } from "@backend/core/sse";
import { readAuthStatus } from "@backend/services/auth-service";
import { runOmakasePipeline } from "@backend/services/omakase-service";
import type { PipelineOptions } from "@backend/types/pipeline";
import { getValidatedProjectRoot } from "@backend/routes/shared/project-root";

export async function postOmakaseStream(req: Request, res: Response) {
  const auth = await readAuthStatus();
  if (!auth.valid) {
    res.status(412).json(auth);
    return;
  }

  const body = req.body as {
    projectRoot?: string;
    brief?: string;
    locale?: string;
    options?: PipelineOptions;
  };
  const projectRoot = await getValidatedProjectRoot(String(body.projectRoot ?? ""));
  const brief = typeof body.brief === "string" ? body.brief.trim() : "";
  if (!brief) {
    res.status(400).json({ message: "Omakase brief is required." });
    return;
  }

  const stream = createSseStream(res);
  try {
    await runOmakasePipeline({
      projectRoot,
      brief,
      locale: body.locale,
      options: body.options
    }, stream);
  } finally {
    stream.close();
  }
}
