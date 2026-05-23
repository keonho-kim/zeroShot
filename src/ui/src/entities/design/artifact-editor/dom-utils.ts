import { protectedAttributes } from "@/entities/design/artifact-editor/const/protected-attributes";
import { allowedStyleProperties } from "@/entities/design/artifact-editor/const/style-properties";
import { discoverySelector, hostNodeSelector, sourcePathAttr } from "@/entities/design/artifact-editor/const/selectors";
import type { ArtifactEditStyles } from "@/entities/design/artifact-editor/types";

export function ensureFullHtml(source: string): string {
  const head = source.trimStart().slice(0, 64).toLowerCase();
  if (head.startsWith("<!doctype") || head.startsWith("<html")) {
    return source;
  }
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>${source}</body>
</html>`;
}

export function annotateSourcePaths(source: string): string {
  if (typeof DOMParser === "undefined") {
    return source;
  }
  try {
    const doc = new DOMParser().parseFromString(source, "text/html");
    doc.body.querySelectorAll(discoverySelector).forEach((element) => {
      if (element.hasAttribute("data-od-id")) {
        return;
      }
      const path = sourcePathForElement(element);
      if (path) {
        element.setAttribute(sourcePathAttr, path);
      }
    });
    return serializeSource(doc, source);
  } catch {
    return source;
  }
}

export function injectBeforeBodyEnd(source: string, injection: string): string {
  if (source.includes("</body>")) {
    return source.replace("</body>", `${injection}</body>`);
  }
  return `${source}${injection}`;
}

export function findEditableElement(doc: Document, id: string): Element | null {
  return doc.querySelector(`[data-od-id="${escapeAttributeSelector(id)}"]`)
    ?? doc.querySelector(`[${sourcePathAttr}="${escapeAttributeSelector(id)}"]`)
    ?? doc.querySelector(`[data-od-runtime-id="${escapeAttributeSelector(id)}"]`)
    ?? findByPath(doc, id);
}

function findByPath(doc: Document, id: string): Element | null {
  if (!id.startsWith("path-")) {
    return null;
  }
  const indexes = id.slice("path-".length).split("-").map((part) => Number(part));
  if (indexes.some((index) => !Number.isInteger(index) || index < 0)) {
    return null;
  }
  let node: Element | null = doc.body;
  for (const index of indexes) {
    node = node?.children.item(index) ?? null;
    if (!node) {
      return null;
    }
  }
  return node;
}

function sourcePathForElement(element: Element): string {
  const parts: number[] = [];
  let node: Element | null = element;
  while (node && node !== node.ownerDocument.body) {
    const parent: Element | null = node.parentElement;
    if (!parent) {
      break;
    }
    const children = Array.from(parent.children).filter((child: Element) => !child.matches(hostNodeSelector));
    parts.unshift(children.indexOf(node));
    node = parent;
  }
  return parts.length ? `path-${parts.join("-")}` : "";
}

export function serializeSource(doc: Document, originalSource: string): string {
  if (!isFullHtmlDocument(originalSource)) {
    return doc.body.innerHTML;
  }
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

function isFullHtmlDocument(source: string): boolean {
  const normalized = source.trimStart().slice(0, 64).toLowerCase();
  return normalized.startsWith("<!doctype") || normalized.startsWith("<html");
}

export function validateFullSource(source: string): void {
  const doc = new DOMParser().parseFromString(source, "text/html");
  if (!doc.body || !doc.body.textContent?.trim()) {
    throw new Error("Source must include meaningful body content.");
  }
}

export function hasElementChildren(element: Element): boolean {
  return Array.from(element.children).some((child) => child.nodeType === 1);
}

export function setInlineStyles(element: HTMLElement, styles: Partial<ArtifactEditStyles>): void {
  for (const [name, value] of Object.entries(styles)) {
    if (!allowedStyleProperties.has(name)) {
      throw new Error(`Style property is not editable: ${name}`);
    }
    const propertyName = camelToKebab(name);
    if (typeof value !== "string" || value.trim() === "") {
      element.style.removeProperty(propertyName);
      continue;
    }
    if (/url\s*\(\s*['"]?\s*javascript:/i.test(value)) {
      throw new Error("Unsafe style URLs are not allowed.");
    }
    element.style.setProperty(propertyName, value.trim());
  }
}

export function setAttributes(element: Element, attributes: Record<string, string>): void {
  for (const [name, value] of Object.entries(attributes)) {
    const normalized = name.trim().toLowerCase();
    if (!isSafeAttributeName(name) || protectedAttributes.has(normalized) || normalized.startsWith("on")) {
      throw new Error(`Attribute is not editable: ${name}`);
    }
    if (value.trim() === "") {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  }
}

export function replaceOuterHtml(doc: Document, element: Element, html: string): void {
  const template = doc.createElement("template");
  template.innerHTML = html.trim();
  const children = Array.from(template.content.children);
  if (children.length !== 1) {
    throw new Error("Replacement HTML must contain exactly one root element.");
  }
  const next = children[0]!;
  if (next.querySelector("script")) {
    throw new Error("Script tags are not allowed in replacement HTML.");
  }
  for (const attr of ["data-od-id", "data-od-edit", "data-od-label"]) {
    const previous = element.getAttribute(attr);
    if (previous && !next.getAttribute(attr)) {
      next.setAttribute(attr, previous);
    }
  }
  element.replaceWith(next);
}

export function setCssToken(doc: Document, token: string, value: string): boolean {
  if (!/^--[a-zA-Z0-9-_]+$/.test(token)) {
    throw new Error("Only CSS custom property tokens can be edited.");
  }
  const pattern = new RegExp(`(${escapeRegExp(token)}\\s*:\\s*)([^;]+)(;)`);
  for (const style of Array.from(doc.querySelectorAll("style"))) {
    const text = style.textContent ?? "";
    if (!pattern.test(text)) {
      continue;
    }
    style.textContent = text.replace(pattern, `$1${value}$3`);
    return true;
  }
  return false;
}

export function isBlockedUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("javascript:") || normalized.startsWith("data:text/html");
}

function isSafeAttributeName(value: string): boolean {
  return /^[a-zA-Z_:][a-zA-Z0-9_:.-]*$/.test(value);
}

export function escapeAttributeSelector(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function camelToKebab(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}
