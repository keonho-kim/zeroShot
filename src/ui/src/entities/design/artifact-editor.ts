export type ArtifactEditorMode = "preview" | "manual-edit" | "inspect" | "source";
export type ArtifactViewport = "desktop" | "tablet" | "mobile";
export type ArtifactEditorTab = "content" | "style" | "attributes" | "html" | "source";
export type ManualEditKind = "text" | "link" | "image" | "container" | "token";

export interface ArtifactEditRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArtifactEditFields {
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
}

export interface ArtifactEditStyles {
  color: string;
  backgroundColor: string;
  fontSize: string;
  fontWeight: string;
  textAlign: string;
  padding: string;
  margin: string;
  borderRadius: string;
  border: string;
  width: string;
  minHeight: string;
  transform: string;
}

export interface ArtifactEditTarget {
  id: string;
  kind: ManualEditKind;
  label: string;
  tagName: string;
  className: string;
  text: string;
  rect: ArtifactEditRect;
  fields: ArtifactEditFields;
  attributes: Record<string, string>;
  styles: ArtifactEditStyles;
  outerHtml: string;
}

export type ArtifactBridgeMessage =
  | { __zeroshotArtifact: true; type: "od-preview-ready" }
  | { __zeroshotArtifact: true; type: "od-edit-targets"; targets: ArtifactEditTarget[] }
  | { __zeroshotArtifact: true; type: "od-edit-select"; target: ArtifactEditTarget; additive?: boolean }
  | { __zeroshotArtifact: true; type: "od-edit-hover"; target: ArtifactEditTarget | null }
  | { __zeroshotArtifact: true; type: "od-edit-drag"; target: ArtifactEditTarget; deltaX: number; deltaY: number }
  | { __zeroshotArtifact: true; type: "od-edit-key-input"; target: ArtifactEditTarget; key: string };

export type ArtifactSourcePatch =
  | { kind: "set-full-source"; source: string }
  | { kind: "set-token"; token: string; value: string }
  | { kind: "set-text"; id: string; value: string }
  | { kind: "set-link"; id: string; text: string; href: string }
  | { kind: "set-image"; id: string; src: string; alt: string }
  | { kind: "set-style"; id: string; styles: Partial<ArtifactEditStyles> }
  | { kind: "set-attributes"; id: string; attributes: Record<string, string> }
  | { kind: "set-outer-html"; id: string; html: string };

export interface ArtifactHistoryEntry {
  id: string;
  label: string;
  patch: ArtifactSourcePatch;
  beforeSource: string;
  afterSource: string;
  createdAt: number;
}

const discoverySelector = "main, nav, section, article, header, footer, div, h1, h2, h3, p, a, button, img, strong, span";
const sourcePathAttr = "data-od-source-path";
const hostNodeSelector = [
  "[data-od-sandbox-shim]",
  "[data-od-edit-bridge]",
  "[data-od-edit-bridge-style]"
].join(",");
const styleProperties = [
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
const allowedStyleProperties = new Set<string>(styleProperties);
const protectedAttributes = new Set([
  "data-od-id",
  "data-od-edit",
  "data-od-label",
  "data-od-runtime-id",
  sourcePathAttr,
  "srcdoc",
  "contenteditable"
]);

export function emptyArtifactEditStyles(): ArtifactEditStyles {
  return Object.fromEntries(styleProperties.map((property) => [property, ""])) as unknown as ArtifactEditStyles;
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

export function createDefaultArtifactHtml(projectTitle: string): string {
  const safeTitle = escapeHtml(projectTitle || "ZeroShot Project");
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle} Artifact</title>
<style>
:root{color-scheme:light;--ink:#1d1d1f;--muted:#6e6e73;--line:#d8d8df;--bg:#f5f5f7;--panel:#fff;--accent:#d9480f}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif}
main{min-height:100vh;padding:29px 18px}
.shell{max-width:820px;margin:0 auto;display:grid;gap:14px}
.hero,.panel{border:1px solid var(--line);border-radius:16px;background:var(--panel);box-shadow:0 14px 38px rgba(31,35,42,.07)}
.hero{padding:34px}
.eyebrow{margin:0 0 8px;color:var(--accent);font-size:10px;font-weight:800;text-transform:uppercase}
h1{margin:0;font-size:43px;line-height:.95;letter-spacing:0}
.sub{margin:13px 0 0;max-width:60ch;color:var(--muted);font-size:14px;line-height:1.55}
.panel{padding:18px}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}
.tile{padding:13px;border-radius:11px;background:#f2f2f7}
.tile strong{display:block;font-size:13px}
.tile span{display:block;margin-top:6px;color:var(--muted);font-size:11px;line-height:1.4}
@media(max-width:720px){h1{font-size:30px}.hero{padding:22px}.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<main data-od-id="artifact-main" data-od-edit="container" data-od-label="Artifact canvas">
  <div class="shell" data-od-id="artifact-shell" data-od-edit="container" data-od-label="Shell">
    <header class="hero" data-od-id="artifact-hero" data-od-edit="container" data-od-label="Hero">
      <p class="eyebrow" data-od-id="artifact-eyebrow" data-od-edit="text" data-od-label="Eyebrow">OPEN DESIGN ARTIFACT</p>
      <h1 data-od-id="artifact-title" data-od-edit="text" data-od-label="Title">${safeTitle}</h1>
      <p class="sub" data-od-id="artifact-summary" data-od-edit="text" data-od-label="Summary">제품 블루프린트가 아직 없어서 DESIGN 편집을 시작할 기본 artifact를 만들었습니다. 요소를 클릭하고 드래그하거나 바로 타이핑해 편집하세요.</p>
    </header>
    <section class="panel" data-od-id="artifact-panel" data-od-edit="container" data-od-label="Feature panel">
      <div class="grid" data-od-id="artifact-grid" data-od-edit="container" data-od-label="Feature grid">
        <article class="tile" data-od-id="artifact-tile-1" data-od-edit="container" data-od-label="Wireframe tile"><strong data-od-id="artifact-tile-1-title" data-od-edit="text">Wire frame</strong><span data-od-id="artifact-tile-1-body" data-od-edit="text">Layout, hierarchy, and component boundaries.</span></article>
        <article class="tile" data-od-id="artifact-tile-2" data-od-edit="container" data-od-label="Presentation tile"><strong data-od-id="artifact-tile-2-title" data-od-edit="text">Presentation</strong><span data-od-id="artifact-tile-2-body" data-od-edit="text">Story order, slides, and review notes.</span></article>
        <article class="tile" data-od-id="artifact-tile-3" data-od-edit="container" data-od-label="Build tile"><strong data-od-id="artifact-tile-3-title" data-od-edit="text">Build handoff</strong><span data-od-id="artifact-tile-3-body" data-od-edit="text">Concrete source changes for Codex.</span></article>
      </div>
    </section>
  </div>
</main>
</body>
</html>`;
}

export function buildArtifactSrcDoc(source: string, mode: ArtifactEditorMode): string {
  const html = annotateSourcePaths(ensureFullHtml(source));
  const bridge = `${buildBridgeStyle()}<script data-od-edit-bridge>${artifactBridgeScript(mode)}<\/script>`;
  return injectBeforeBodyEnd(html, bridge);
}

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

export function nextTextFromKey(currentText: string, key: string): string {
  if (key === "Backspace") {
    return currentText.slice(0, -1);
  }
  if (key === "Enter") {
    return `${currentText}\n`;
  }
  if (key.length === 1) {
    return `${currentText}${key}`;
  }
  return currentText;
}

export function translatedStyle(style: string | undefined, deltaX: number, deltaY: number): string {
  const match = /translate\(\s*(-?\d+(?:\.\d+)?)px(?:,\s*|\s+)(-?\d+(?:\.\d+)?)px\s*\)/.exec(style ?? "");
  const x = Math.round((match ? Number(match[1]) : 0) + deltaX);
  const y = Math.round((match ? Number(match[2]) : 0) + deltaY);
  return `translate(${x}px, ${y}px)`;
}

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

export function readTargetAttributesAsJson(target: ArtifactEditTarget | null): string {
  if (!target) {
    return "{}";
  }
  return JSON.stringify(target.attributes, null, 2);
}

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

function ensureFullHtml(source: string): string {
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

function annotateSourcePaths(source: string): string {
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

function injectBeforeBodyEnd(source: string, injection: string): string {
  if (source.includes("</body>")) {
    return source.replace("</body>", `${injection}</body>`);
  }
  return `${source}${injection}`;
}

function buildBridgeStyle(): string {
  return `<style data-od-edit-bridge-style>
html [data-od-id],
html [data-od-source-path],
html [data-od-runtime-id] { outline: 1px dashed rgb(0 0 0 / 58%) !important; outline-offset: 3px !important; }
html [data-od-selected='true'] { outline: 3px solid #dc2626 !important; outline-offset: 3px !important; }
</style>`;
}

function findEditableElement(doc: Document, id: string): Element | null {
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

function serializeSource(doc: Document, originalSource: string): string {
  if (!isFullHtmlDocument(originalSource)) {
    return doc.body.innerHTML;
  }
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

function isFullHtmlDocument(source: string): boolean {
  const normalized = source.trimStart().slice(0, 64).toLowerCase();
  return normalized.startsWith("<!doctype") || normalized.startsWith("<html");
}

function validateFullSource(source: string): void {
  const doc = new DOMParser().parseFromString(source, "text/html");
  if (!doc.body || !doc.body.textContent?.trim()) {
    throw new Error("Source must include meaningful body content.");
  }
}

function hasElementChildren(element: Element): boolean {
  return Array.from(element.children).some((child) => child.nodeType === 1);
}

function setInlineStyles(element: HTMLElement, styles: Partial<ArtifactEditStyles>): void {
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

function setAttributes(element: Element, attributes: Record<string, string>): void {
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

function replaceOuterHtml(doc: Document, element: Element, html: string): void {
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

function setCssToken(doc: Document, token: string, value: string): boolean {
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

function isBlockedUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("javascript:") || normalized.startsWith("data:text/html");
}

function isSafeAttributeName(value: string): boolean {
  return /^[a-zA-Z_:][a-zA-Z0-9_:.-]*$/.test(value);
}

function escapeAttributeSelector(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

function escapeHtml(value: string): string {
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

function artifactBridgeScript(initialMode: ArtifactEditorMode): string {
  return `
(() => {
  const marker = true;
  const selector = ${JSON.stringify(discoverySelector)};
  const sourcePathAttr = ${JSON.stringify(sourcePathAttr)};
  const hostNodeSelector = ${JSON.stringify(hostNodeSelector)};
  const styleProps = ${JSON.stringify(styleProperties)};
  let editMode = ${JSON.stringify(initialMode !== "preview")};

  const post = (payload) => window.parent.postMessage({ __zeroshotArtifact: marker, ...payload }, "*");
  const isHostNode = (element) => Boolean(element && element.matches && element.matches(hostNodeSelector));
  const isMappable = (element) => Boolean(element && element.hasAttribute && (element.hasAttribute("data-od-id") || element.hasAttribute(sourcePathAttr)));
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.width >= 4 && rect.height >= 4;
  };
  const domPath = (element) => {
    const parts = [];
    let current = element;
    while (current && current !== document.body) {
      const parent = current.parentElement;
      if (!parent) break;
      const children = Array.prototype.slice.call(parent.children).filter((child) => !isHostNode(child));
      parts.unshift(children.indexOf(current));
      current = parent;
    }
    return parts.length ? "path-" + parts.join("-") : "";
  };
  const idFor = (element) => {
    const explicit = element.getAttribute("data-od-id");
    if (explicit) return explicit;
    const generated = element.getAttribute(sourcePathAttr) || element.getAttribute("data-od-runtime-id") || domPath(element);
    if (generated) element.setAttribute("data-od-runtime-id", generated);
    return generated || "unknown";
  };
  const kindFor = (element) => {
    const explicit = element.getAttribute("data-od-edit");
    if (["text", "link", "image", "container", "token"].includes(explicit)) return explicit;
    const tag = element.tagName ? element.tagName.toLowerCase() : "";
    if (tag === "a") return "link";
    if (tag === "img") return "image";
    if (["section","main","nav","div","article","header","footer"].includes(tag)) return "container";
    return "text";
  };
  const labelFor = (element, id, kind) => {
    const explicit = element.getAttribute("data-od-label");
    if (explicit) return explicit;
    const text = (element.textContent || "").replace(/\\s+/g, " ").trim();
    if (text) return text.slice(0, 42);
    if (kind === "image") return element.getAttribute("alt") || id;
    return (element.tagName ? element.tagName.toLowerCase() : "element") + " #" + id;
  };
  const fieldsFor = (element, kind) => {
    if (kind === "link") return { text: (element.textContent || "").trim(), href: element.getAttribute("href") || "" };
    if (kind === "image") return { src: element.getAttribute("src") || "", alt: element.getAttribute("alt") || "" };
    return { text: (element.textContent || "").trim() };
  };
  const attrsFor = (element) => {
    const attrs = {};
    for (const attr of element.attributes) {
      if (!attr || attr.name === "data-od-runtime-id") continue;
      attrs[attr.name] = attr.value;
    }
    return attrs;
  };
  const stylesFor = (element) => {
    const computed = window.getComputedStyle(element);
    const styles = {};
    styleProps.forEach((prop) => {
      styles[prop] = element.style[prop] || computed[prop] || "";
    });
    return styles;
  };
  const targetFor = (element, includeOuterHtml) => {
    const rect = element.getBoundingClientRect();
    const kind = kindFor(element);
    const id = idFor(element);
    return {
      id,
      kind,
      label: labelFor(element, id, kind),
      tagName: element.tagName ? element.tagName.toLowerCase() : "element",
      className: typeof element.className === "string" ? element.className : "",
      text: (element.textContent || element.getAttribute("alt") || "").replace(/\\s+/g, " ").trim().slice(0, 180),
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      fields: fieldsFor(element, kind),
      attributes: attrsFor(element),
      styles: stylesFor(element),
      outerHtml: includeOuterHtml ? (element.outerHTML || "").replace(/\\sdata-od-runtime-id="[^"]*"/g, "") : ""
    };
  };
  const allTargets = () => Array.from(document.body ? document.body.querySelectorAll(selector) : [])
    .filter((element) => !isHostNode(element) && isMappable(element) && visible(element))
    .map((element) => targetFor(element, false));
  const postTargets = () => {
    post({ type: "od-edit-targets", targets: allTargets() });
  };
  const closestTarget = (node) => {
    let element = node instanceof Element ? node : null;
    let fallback = null;
    while (element && element !== document.documentElement) {
      if (element !== document.body && !isHostNode(element) && element.matches(selector) && isMappable(element)) {
        if (element.hasAttribute("data-od-id") || element.hasAttribute("data-od-edit")) return element;
        if (!fallback) fallback = element;
      }
      element = element.parentElement;
    }
    return fallback;
  };
  const markSelectedIds = (ids) => {
    const selected = new Set(Array.isArray(ids) ? ids : []);
    document.querySelectorAll("[data-od-selected='true']").forEach((node) => node.removeAttribute("data-od-selected"));
    selected.forEach((id) => {
      const target = document.querySelector("[data-od-id='" + id + "'],[data-od-runtime-id='" + id + "'],[" + sourcePathAttr + "='" + id + "']");
      if (target && !isHostNode(target)) target.setAttribute("data-od-selected", "true");
    });
  };
  const select = (element, event) => {
    const target = targetFor(element, true);
    if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
    element.focus({ preventScroll: true });
    post({ type: "od-edit-select", target, additive: Boolean(event && (event.ctrlKey || event.metaKey)) });
  };

  window.addEventListener("message", (event) => {
    const payload = event.data;
    if (!payload || payload.__zeroshotArtifact !== true) return;
    if (payload.type === "od-edit-mode") {
      editMode = payload.mode !== "preview";
      document.documentElement.setAttribute("data-od-edit-enabled", String(editMode));
      setTimeout(postTargets, 0);
    }
    if (payload.type === "od-refresh-targets") setTimeout(postTargets, 0);
    if (payload.type === "od-highlight-targets") markSelectedIds(payload.ids);
  });

  document.addEventListener("click", (event) => {
    const element = closestTarget(event.target);
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    select(element, event);
  }, true);

  document.addEventListener("contextmenu", (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    const element = closestTarget(event.target);
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    select(element, event);
  }, true);

  window.addEventListener("resize", postTargets);
  document.documentElement.setAttribute("data-od-edit-enabled", String(editMode));
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      postTargets();
      post({ type: "od-preview-ready" });
    });
  } else {
    setTimeout(() => {
      postTargets();
      post({ type: "od-preview-ready" });
    }, 0);
  }
})();`;
}
