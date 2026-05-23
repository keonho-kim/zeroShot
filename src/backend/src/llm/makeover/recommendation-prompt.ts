import { languageName } from "@backend/i18n/locale.js";
import { resourceCatalogSummary } from "@backend/llm/resources/prompt.js";
import type { ResourceManifest } from "@backend/types/resource.js";

function resourceList(title: string, resources: ResourceManifest[]): string {
  return [
    `## ${title}`,
    ...resources.map((resource) => [
      `- id: ${resource.id}`,
      `  name: ${resource.name}`,
      resource.description ? `  description: ${resource.description.replace(/\s+/g, " ").slice(0, 240)}` : "",
      resource.tags.length ? `  tags: ${resource.tags.join(", ")}` : ""
    ].filter(Boolean).join("\n"))
  ].join("\n");
}

export function buildRecommendationPrompt(params: {
  locale: string;
  productHtml: string;
  architectContext: string;
  catalog: { skills: ResourceManifest[]; designTemplates: ResourceManifest[]; designSystems: ResourceManifest[] };
}): string {
  const language = languageName(params.locale);
  return [
    "You are ZeroShot DESIGN recommendation agent.",
    "",
    "Return only JSON matching the provided schema. Put chatMessage first.",
    "chatMessage must be a concise user-facing status update that says what you are comparing or preparing.",
    "Recommend exactly 5 design systems and exactly 5 design templates for the DESIGN request flow.",
    "Every resourceId must be copied exactly from the provided resource catalog.",
    "Do not invent resource IDs. Do not expose raw resource names as labels.",
    "Write labels, details, and reasons as user-facing choices that describe the feel, structure, and fit.",
    `Use ${language} for chatMessage, title, summary, labels, details, and reasons.`,
    "",
    "Recommendation criteria:",
    "- Use ARCHITECT/PRODUCT.html as the primary product contract.",
    "- Use optional supporting files under ARCHITECT/ only when they clarify product planning.",
    "- Do not inspect bootstrap scaffold, source code, DESIGN output, runs, or unrelated project folders.",
    "- Match the product's target user, workflow density, interaction style, and content shape.",
    "- Prefer polished, modern product-grade UI/UX over generic templates.",
    "- Skills are available read-only context, but are not user-selectable.",
    "",
    resourceCatalogSummary(params.catalog),
    "",
    resourceList("Selectable Design Systems", params.catalog.designSystems),
    "",
    resourceList("Selectable Design Templates", params.catalog.designTemplates),
    "",
    "ARCHITECT folder context:",
    params.architectContext || "No ARCHITECT folder context was found.",
    "",
    "ARCHITECT/PRODUCT.html source:",
    params.productHtml || "No ARCHITECT/PRODUCT.html was found."
  ].join("\n");
}
