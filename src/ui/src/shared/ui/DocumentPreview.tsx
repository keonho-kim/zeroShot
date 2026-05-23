import notoSans400Url from "@fontsource/noto-sans/latin-400.css?url";
import notoSans700Url from "@fontsource/noto-sans/latin-700.css?url";
import notoSansKr400Url from "@fontsource/noto-sans-kr/korean-400.css?url";
import notoSansKr700Url from "@fontsource/noto-sans-kr/korean-700.css?url";
import { HighlightedCodeBlock } from "@/shared/ui/HighlightedCodeBlock";
import { languageForDocument } from "@/entities/code-highlighting/code-language";

interface DocumentPreviewProps {
  filename: string;
  content: string;
  className?: string;
}

export function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.html$/i, "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function reportStyle(): string {
  return `
    @import url("${notoSans400Url}");
    @import url("${notoSans700Url}");
    @import url("${notoSansKr400Url}");
    @import url("${notoSansKr700Url}");
    :root {
      color-scheme: light;
      --zs-bg: #fbfaf5;
      --zs-fg: #151515;
      --zs-muted: #5f6673;
      --zs-line: #d9dde7;
      --zs-panel: #ffffff;
      --zs-panel-soft: #f3f6fb;
      --zs-accent: #0ea5e9;
      --zs-success: #16a34a;
      --zs-danger: #dc2626;
      --zs-code: #10151f;
    }
    html, body {
      margin: 0;
      min-height: 100%;
      background: var(--zs-bg);
      color: var(--zs-fg);
      font-family: "Noto Sans KR", "Noto Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 15px;
      line-height: 1.65;
      text-rendering: optimizeLegibility;
    }
    body {
      padding: 0;
    }
    main {
      max-width: 1040px;
      margin: 0 auto;
      padding: 40px 28px 56px;
    }
    header {
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--zs-line);
    }
    h1 {
      margin: 0 0 10px;
      font-size: clamp(30px, 5vw, 52px);
      line-height: 1.08;
      letter-spacing: 0;
    }
    h2 {
      margin: 30px 0 12px;
      font-size: 18px;
      line-height: 1.3;
    }
    p {
      margin: 0 0 12px;
    }
    ul {
      margin: 10px 0 0;
      padding-left: 20px;
    }
    li + li {
      margin-top: 6px;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      color: var(--zs-muted);
      font-size: 12px;
    }
    .meta > span,
    .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 28px;
      border: 1px solid var(--zs-line);
      border-radius: 999px;
      background: var(--zs-panel);
      padding: 3px 10px;
      font-weight: 700;
    }
    .status {
      color: var(--zs-success);
    }
    .status:has(+ *) {
      color: inherit;
    }
    .panel,
    details {
      border: 1px solid var(--zs-line);
      border-radius: 14px;
      background: var(--zs-panel);
      box-shadow: 0 18px 44px rgb(20 26 36 / 8%);
    }
    .panel {
      padding: 18px 20px;
    }
    details {
      margin: 14px 0;
      padding: 16px 18px;
    }
    summary {
      cursor: pointer;
      font-weight: 800;
    }
    code {
      border-radius: 6px;
      background: var(--zs-panel-soft);
      padding: 1px 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.92em;
    }
    pre {
      overflow: auto;
      border-radius: 12px;
      background: var(--zs-code);
      color: #f6f8fa;
      padding: 16px;
    }
    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }
    .muted {
      color: var(--zs-muted);
    }
  `;
}

function injectReportStyle(html: string): string {
  const style = `<style data-zeroshot-report-style>${reportStyle()}</style>`;
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${style}</head>`);
  }
  if (/<html[\s>]/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${style}</head>`);
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${style}</head><body>${html}</body></html>`;
}

export function DocumentPreview({ filename, content, className }: DocumentPreviewProps) {
  if (!filename.toLowerCase().endsWith(".html")) {
    return <HighlightedCodeBlock code={content} language={languageForDocument(filename)} />;
  }

  return (
    <iframe
      className={className}
      sandbox="allow-scripts allow-same-origin"
      title={titleFromFilename(filename)}
      srcDoc={injectReportStyle(content)}
    />
  );
}
