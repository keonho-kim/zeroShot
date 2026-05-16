import { useEffect, useMemo, useState } from "react";
import type { HighlightLanguage } from "@/entities/code-highlighting/code-language";
import { highlightCode } from "@/lib/api";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function HighlightedCodeBlock({ code, language }: { code: string; language: HighlightLanguage }) {
  const [html, setHtml] = useState("");
  const fallbackHtml = useMemo(() => `<pre><code>${escapeHtml(code || " ")}</code></pre>`, [code]);

  useEffect(() => {
    let mounted = true;

    highlightCode({ code, language })
      .then((result) => {
        if (mounted) {
          setHtml(result.html);
        }
      })
      .catch(() => {
        if (mounted) {
          setHtml(fallbackHtml);
        }
      });

    return () => {
      mounted = false;
    };
  }, [code, fallbackHtml, language]);

  return <div className="highlighted-code-block" dangerouslySetInnerHTML={{ __html: html || fallbackHtml }} />;
}
