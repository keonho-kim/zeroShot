import { buildImplementationGuidance } from "@backend/llm/build/prompt.js";

export { buildImplementationGuidance } from "@backend/llm/build/prompt.js";

export function ensureBuildImplementationGuidance(content: string): string {
  if (content.includes("## Build Implementation Guidance")) {
    return content;
  }
  return [content.trimEnd(), "", buildImplementationGuidance, ""].join("\n");
}
