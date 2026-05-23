import type { ArtifactBridgeMessage, ArtifactEditTarget } from "@/entities/design/artifact-editor/types";

function isArtifactEditTarget(value: unknown): value is ArtifactEditTarget {
  if (!value || typeof value !== "object") {
    return false;
  }
  const target = value as Partial<ArtifactEditTarget>;
  return typeof target.id === "string"
    && target.id.length <= 200
    && typeof target.kind === "string"
    && typeof target.label === "string"
    && target.label.length <= 300
    && typeof target.tagName === "string"
    && Boolean(target.rect)
    && typeof target.rect === "object"
    && (!target.outerHtml || target.outerHtml.length <= 200_000);
}

export function isArtifactBridgeMessage(value: unknown): value is ArtifactBridgeMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const payload = value as { __zeroshotArtifact?: unknown; type?: unknown; targets?: unknown; target?: unknown };
  if (payload.__zeroshotArtifact !== true || typeof payload.type !== "string") {
    return false;
  }
  if (payload.type === "od-preview-ready") {
    return true;
  }
  if (payload.type === "od-edit-targets") {
    return Array.isArray(payload.targets)
      && payload.targets.length <= 2000
      && payload.targets.every(isArtifactEditTarget);
  }
  if (payload.type === "od-edit-select" || payload.type === "od-edit-hover" || payload.type === "od-edit-drag" || payload.type === "od-edit-key-input") {
    return payload.target === null || isArtifactEditTarget(payload.target);
  }
  return false;
}
