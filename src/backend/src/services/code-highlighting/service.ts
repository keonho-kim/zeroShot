import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/dist/langs/bash.mjs";
import diff from "shiki/dist/langs/diff.mjs";
import json from "shiki/dist/langs/json.mjs";
import markdown from "shiki/dist/langs/markdown.mjs";
import tsx from "shiki/dist/langs/tsx.mjs";
import typescript from "shiki/dist/langs/typescript.mjs";
import githubDark from "shiki/dist/themes/github-dark.mjs";

export type HighlightLanguage = "bash" | "diff" | "json" | "markdown" | "plaintext" | "typescript";

const supportedLanguages = new Set<HighlightLanguage>(["bash", "diff", "json", "markdown", "plaintext", "typescript"]);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function plainTextToHtml(code: string) {
  return `<pre class="shiki github-dark" tabindex="0"><code>${escapeHtml(code || " ")}</code></pre>`;
}

const highlighterPromise = createHighlighterCore({
  engine: createJavaScriptRegexEngine(),
  langs: [bash, diff, json, markdown, tsx, typescript],
  themes: [githubDark]
});

export function normalizeHighlightLanguage(value: unknown): HighlightLanguage {
  return typeof value === "string" && supportedLanguages.has(value as HighlightLanguage)
    ? value as HighlightLanguage
    : "plaintext";
}

export async function highlightCode(code: string, language: HighlightLanguage = "plaintext") {
  if (language === "plaintext") {
    return plainTextToHtml(code);
  }

  const highlighter = await highlighterPromise;
  return highlighter.codeToHtml(code || " ", {
    lang: language,
    theme: "github-dark"
  });
}
