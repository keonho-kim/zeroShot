import type { ArtifactEditTarget } from "@/entities/design/artifact-editor/types";

export function readTargetAttributesAsJson(target: ArtifactEditTarget | null): string {
  if (!target) {
    return "{}";
  }
  return JSON.stringify(target.attributes, null, 2);
}
