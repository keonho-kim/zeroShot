import type { ResourceManifest } from "@backend/types.js";

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

SKILL.md body:
${resource.body.slice(0, 32000)}`;
}
