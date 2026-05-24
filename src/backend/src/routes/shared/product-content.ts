import { readProjectSettings } from "@backend/services/app-storage/service";
import { buildResourcePromptContext } from "@backend/services/resource/service";

export async function appendActiveResourceContext(projectRoot: string, content: string): Promise<string> {
  const settings = await readProjectSettings(projectRoot);
  const resourceContext = await buildResourcePromptContext({
    activeSkillId: settings.activeSkillId,
    activeDesignTemplateId: settings.activeDesignTemplateId,
    activeDesignSystemId: settings.activeDesignSystemId,
    includeCatalogSummary: true
  });

  if (!resourceContext.trim()) {
    return content;
  }

  return [
    content.trimEnd(),
    "",
    "## Active Open Design Resources",
    "",
    "The following locally loaded ZeroShot resources are part of this product direction. Use them as concrete guidance when implementing the build.",
    "",
    resourceContext,
    ""
  ].join("\n");
}

export function productContentToHtml(content: string): string {
  const trimmed = content.trim();
  if (/<!doctype html/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
    return trimmed;
  }
  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>PRODUCT</title></head>",
    "<body>",
    "<main>",
    "<h1>PRODUCT Blueprint</h1>",
    `<pre>${escapeHtml(trimmed)}</pre>`,
    "</main>",
    "</body>",
    "</html>",
    ""
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
