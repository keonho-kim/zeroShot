import { modeDisplayName } from "@backend/llm/makeover/prompt";
import type { DesignRuntimeResponse } from "@backend/types/design";

function designArtifactDisplayPath(path: string): string {
  return path === "DESIGN/index.html" ? "INTERACTIVE CANVAS" : path;
}

export function composeDesignMarkdown(response: DesignRuntimeResponse): string {
  return [
    "# DESIGN",
    "",
    `Runtime mode: ${modeDisplayName(response.mode)}`,
    `Generated at: ${response.generatedAt}`,
    "",
    `## ${response.title}`,
    "",
    response.summary,
    "",
    ...response.sections.flatMap((section) => [
      `## ${section.title}`,
      "",
      section.body,
      ""
    ]),
    "## Runtime Actions",
    "",
    ...response.actions.map((action) => `- **${action.label}** (${action.owner}): ${action.detail}`),
    "",
    "## Tracked Artifacts",
    "",
    ...response.artifacts.map((artifact) => `- \`${designArtifactDisplayPath(artifact.path)}\` (${artifact.type}) - ${artifact.title}: ${artifact.description}`),
    "",
    "## Generated Files",
    "",
    ...response.files.map((file) => `- \`${designArtifactDisplayPath(file.path)}\` (${file.type}) - ${file.title}`),
    ""
  ].join("\n");
}
