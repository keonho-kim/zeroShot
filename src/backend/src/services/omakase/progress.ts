import type { StageProgressEvent } from "@backend/services/omakase/types";

export function progressMessage(event: StageProgressEvent): string {
  return [event.title, event.detail, event.status].filter(Boolean).join(" · ");
}
