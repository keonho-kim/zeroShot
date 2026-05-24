import type { ArtifactEditStyles } from "@/entities/design/artifact-editor/types";

export const styleProperties = [
  "color",
  "backgroundColor",
  "fontSize",
  "fontWeight",
  "textAlign",
  "padding",
  "margin",
  "borderRadius",
  "border",
  "width",
  "minHeight",
  "transform"
] as const;

export const allowedStyleProperties = new Set<string>(styleProperties);

export function emptyArtifactEditStyles(): ArtifactEditStyles {
  return Object.fromEntries(styleProperties.map((property) => [property, ""])) as unknown as ArtifactEditStyles;
}
