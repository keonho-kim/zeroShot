import type { Request, Response } from "express";
import { createSseStream } from "@backend/core/sse";
import { jobManager } from "@backend/services/job-manager";

export async function getJobStream(req: Request, res: Response) {
  const jobId = String(req.params.jobId);
  const current = jobManager.getCurrentJob();
  const history = jobManager.getEvents(jobId);

  if (!current || current.id !== jobId) {
    res.status(404).json({ message: "Job not found" });
    return;
  }

  const stream = createSseStream(res);

  const writeEvent = (event: { type: string; data: Record<string, unknown>; seq: number }) => {
    void stream.write(event.type, event.data, event.seq);
  };

  for (const event of history) {
    await stream.write(event.type, event.data, event.seq);
  }
  const unsubscribe = jobManager.subscribe(jobId, writeEvent);

  req.on("close", () => {
    unsubscribe();
    stream.close();
  });
}
