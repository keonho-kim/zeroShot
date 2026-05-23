import type { ResourceManifest } from "@backend/types/resource.js";

export function resourcePromptBlock(title: string, resource?: ResourceManifest): string {
  if (!resource) {
    return "";
  }

  const files = resource.files.length
    ? resource.files.map((file) => `- ${file.kind}: ${file.path} (${file.size} bytes)`).join("\n")
    : "- No extra files indexed.";

  return `## ${title}
ID: ${resource.id}
Name: ${resource.name}
Description: ${resource.description || "No description provided."}
Root: ${resource.root}
Rules:
- Use this resource as concrete design and implementation guidance.
- Read only the referenced files you need.
- Reuse assets from the resource root instead of recreating them when they fit.

Available files:
${files}

Resource body:
${resource.body.slice(0, 32000)}`;
}

function summarizeResources(title: string, resources: ResourceManifest[]): string {
  if (!resources.length) {
    return `### ${title}\n- none`;
  }
  return [
    `### ${title}`,
    ...resources.slice(0, 120).map((resource) => `- ${resource.id}: ${resource.name}${resource.description ? ` - ${resource.description.replace(/\s+/g, " ").slice(0, 180)}` : ""}`)
  ].join("\n");
}

export function resourceCatalogSummary(catalog: {
  skills: ResourceManifest[];
  designTemplates: ResourceManifest[];
  designSystems: ResourceManifest[];
}): string {
  return [
    "## Available ZeroShot Resources",
    "Treat these bundled resources as read-only guidance. Select only the resources that fit the product instead of exposing every option to the user.",
    summarizeResources("Skills", catalog.skills),
    summarizeResources("Design Systems", catalog.designSystems),
    summarizeResources("Design Templates", catalog.designTemplates)
  ].join("\n\n");
}
