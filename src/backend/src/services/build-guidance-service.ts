import { buildImplementationGuidance } from "@backend/llm/build/prompt";

export { buildImplementationGuidance } from "@backend/llm/build/prompt";

export function ensureBuildImplementationGuidance(content: string): string {
  if (content.includes("## Build Implementation Guidance")) {
    return content;
  }
  return [content.trimEnd(), "", buildImplementationGuidance, ""].join("\n");
}
