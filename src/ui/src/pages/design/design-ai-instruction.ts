import type { ArtifactEditTarget } from "@/entities/design/artifact-editor/types";
import type { ArtifactCommentCapture } from "@/pages/design/artifact-workbench/types";

export function composeDesignAiInstruction(params: {
  selectedTargets: ArtifactEditTarget[];
  commentCapture: ArtifactCommentCapture | null;
  aiInstruction: string;
  artifactSource: string;
}): string {
  const targetContext = params.selectedTargets.length
    ? [
      "Selected canvas targets:",
      ...params.selectedTargets.map((target, index) => [
        `Target ${index + 1}:`,
        `- id: ${target.id}`,
        `- label: ${target.label}`,
        `- kind: ${target.kind}`,
        `- text: ${target.text}`,
        `- rect: x ${target.rect.x}, y ${target.rect.y}, width ${target.rect.width}, height ${target.rect.height}`,
        `- outerHtml: ${target.outerHtml.slice(0, 1200)}`
      ].join("\n"))
    ].join("\n")
    : "";
  const commentContext = params.commentCapture
    ? [
      "Canvas comment capture:",
      params.commentCapture.note ? `- comment text: ${params.commentCapture.note}` : "",
      "- Clean interactive canvas screenshot is attached below as a data URL.",
      params.commentCapture.cleanImage,
      "- Annotated screenshot shown to the user is attached below as a data URL.",
      params.commentCapture.annotatedImage
    ].filter(Boolean).join("\n")
    : "";

  return [
    "Update the existing DESIGN/index.html as one coherent interactive canvas.",
    "Do not wait for a selected element. Interpret the user's request against the full current canvas.",
    "Active resource instruction:",
    "Load and apply the active skill, design template, and design system context already configured for this project before making the change.",
    targetContext,
    commentContext,
    "Requested design change:",
    params.aiInstruction.trim(),
    "Current DESIGN/index.html source:",
    params.artifactSource || "(not available)"
  ].filter(Boolean).join("\n\n");
}
