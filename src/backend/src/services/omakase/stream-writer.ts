import { stageTitle } from "@backend/services/omakase/const/stages";
import type { OmakaseStage, OmakaseStream, StageProgressEvent } from "@backend/services/omakase/types";

export async function writeStageStarted(stream: OmakaseStream, stage: OmakaseStage, detail: string) {
  await stream.write("stage_started", { stage, title: stageTitle(stage), detail });
}

export async function writeStageProgress(stream: OmakaseStream, stage: OmakaseStage, event: StageProgressEvent) {
  await stream.write("stage_progress", { stage, event });
}

export async function writeStageMessage(stream: OmakaseStream, stage: OmakaseStage, message: string) {
  if (!message.trim()) {
    return;
  }
  await stream.write("stage_message", { stage, message });
}

export async function writeStageCompleted(stream: OmakaseStream, stage: OmakaseStage, detail: string, extra: Record<string, unknown> = {}) {
  await stream.write("stage_completed", { stage, title: stageTitle(stage), detail, ...extra });
}

export async function writeStageFailed(stream: OmakaseStream, stage: OmakaseStage, message: string) {
  await stream.write("stage_failed", { stage, title: stageTitle(stage), message });
}
