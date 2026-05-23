import type { ArtifactEditTarget, ArtifactSourcePatch } from "@/entities/design/artifact-editor/types";

export function patchLabel(patch: ArtifactSourcePatch, target?: ArtifactEditTarget | null): string {
  const subject = target?.label || ("id" in patch ? patch.id : patch.kind);
  if (patch.kind === "set-full-source") {
    return "Source update";
  }
  if (patch.kind === "set-token") {
    return `Token ${patch.token}`;
  }
  return `${patch.kind.replace("set-", "")} · ${subject}`;
}
