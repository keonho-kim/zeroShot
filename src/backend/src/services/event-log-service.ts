import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { getAppEventsPath } from "@backend/core/workspace.js";

export async function appendAppEvent(type: string, payload: Record<string, unknown>): Promise<void> {
  const path = getAppEventsPath();
  await mkdir(dirname(path), { recursive: true });
  await appendFile(
    path,
    `${JSON.stringify({
      time: new Date().toISOString(),
      type,
      ...payload
    })}\n`,
    "utf8"
  );
}
