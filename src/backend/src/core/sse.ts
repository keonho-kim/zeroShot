import type { Response } from "express";
import { once } from "node:events";

type FlushableResponse = Response & {
  flush?: () => void;
};

export interface SseStream {
  write: (type: string, data: unknown, id?: number) => Promise<void>;
  close: () => void;
}

export function createSseStream(res: Response): SseStream {
  let seq = 0;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  res.flushHeaders?.();
  res.socket?.setNoDelay(true);

  return {
    async write(type, data, id) {
      if (res.writableEnded || res.destroyed) {
        return;
      }

      const eventId = id ?? ++seq;
      seq = Math.max(seq, eventId);
      const payload = [
        `id: ${eventId}`,
        `event: ${type}`,
        `data: ${JSON.stringify(data)}`,
        "",
        ""
      ].join("\n");
      const writable = res.write(payload);
      (res as FlushableResponse).flush?.();
      if (!writable && !res.writableEnded && !res.destroyed) {
        await Promise.race([
          once(res, "drain"),
          once(res, "close"),
          once(res, "error")
        ]);
      }
    },
    close() {
      if (!res.writableEnded && !res.destroyed) {
        res.end();
      }
    }
  };
}
