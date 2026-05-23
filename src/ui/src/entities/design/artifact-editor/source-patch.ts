import {
  findEditableElement,
  hasElementChildren,
  isBlockedUrl,
  replaceOuterHtml,
  serializeSource,
  setAttributes,
  setCssToken,
  setInlineStyles,
  validateFullSource
} from "@/entities/design/artifact-editor/dom-utils";
import type { ArtifactSourcePatch } from "@/entities/design/artifact-editor/types";

export function applyArtifactSourcePatch(source: string, patch: ArtifactSourcePatch): string {
  if (patch.kind === "set-full-source") {
    validateFullSource(patch.source);
    return patch.source;
  }

  const doc = new DOMParser().parseFromString(source, "text/html");

  if (patch.kind === "set-token") {
    if (!setCssToken(doc, patch.token, patch.value)) {
      throw new Error(`Token not found: ${patch.token}`);
    }
    return serializeSource(doc, source);
  }

  const target = findEditableElement(doc, patch.id);
  if (!target) {
    throw new Error(`Selected artifact target is no longer available: ${patch.id}`);
  }

  if (patch.kind === "set-text") {
    if (hasElementChildren(target)) {
      throw new Error("This element contains nested markup. Use the HTML tab instead.");
    }
    target.textContent = patch.value;
  }

  if (patch.kind === "set-link") {
    if (target.tagName.toLowerCase() !== "a") {
      throw new Error("The selected element is not a link.");
    }
    if (isBlockedUrl(patch.href)) {
      throw new Error("Unsafe link URLs are not allowed.");
    }
    if (hasElementChildren(target)) {
      const currentText = target.textContent?.trim() ?? "";
      if (patch.text.trim() !== currentText) {
        throw new Error("This link contains nested markup. Use the HTML tab to change its label.");
      }
    } else {
      target.textContent = patch.text;
    }
    target.setAttribute("href", patch.href);
  }

  if (patch.kind === "set-image") {
    if (target.tagName.toLowerCase() !== "img") {
      throw new Error("The selected element is not an image.");
    }
    if (isBlockedUrl(patch.src) || patch.src.startsWith("file://")) {
      throw new Error("Unsafe image URLs are not allowed.");
    }
    target.setAttribute("src", patch.src);
    target.setAttribute("alt", patch.alt);
  }

  if (patch.kind === "set-style") {
    setInlineStyles(target as HTMLElement, patch.styles);
  }

  if (patch.kind === "set-attributes") {
    setAttributes(target, patch.attributes);
  }

  if (patch.kind === "set-outer-html") {
    replaceOuterHtml(doc, target, patch.html);
  }

  return serializeSource(doc, source);
}
