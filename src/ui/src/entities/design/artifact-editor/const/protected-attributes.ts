import { sourcePathAttr } from "@/entities/design/artifact-editor/const/selectors";

export const protectedAttributes = new Set([
  "data-od-id",
  "data-od-edit",
  "data-od-label",
  "data-od-runtime-id",
  sourcePathAttr,
  "srcdoc",
  "contenteditable"
]);
