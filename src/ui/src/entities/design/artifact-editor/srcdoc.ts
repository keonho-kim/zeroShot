import { discoverySelector, hostNodeSelector, sourcePathAttr } from "@/entities/design/artifact-editor/const/selectors";
import { styleProperties } from "@/entities/design/artifact-editor/const/style-properties";
import { annotateSourcePaths, ensureFullHtml, escapeHtml, injectBeforeBodyEnd } from "@/entities/design/artifact-editor/dom-utils";
import type { ArtifactEditorMode } from "@/entities/design/artifact-editor/types";

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
      <p class="sub" data-od-id="artifact-summary" data-od-edit="text" data-od-label="Summary">No product blueprint is available yet, so this starter artifact is ready for design editing. Click elements, drag them, or type directly to edit.</p>
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

function buildBridgeStyle(): string {
  return `<style data-od-edit-bridge-style>
html [data-od-id],
html [data-od-source-path],
html [data-od-runtime-id] { outline: 1px dashed rgb(0 0 0 / 58%) !important; outline-offset: 3px !important; }
html [data-od-selected='true'] { outline: 3px solid #dc2626 !important; outline-offset: 3px !important; }
</style>`;
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
