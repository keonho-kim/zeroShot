import { buildImplementationGuidance } from "@backend/prompts/build/implementation-guidance.js";

export { buildImplementationGuidance } from "@backend/prompts/build/implementation-guidance.js";

export function ensureBuildImplementationGuidance(content: string): string {
  if (content.includes("## Build Implementation Guidance")) {
    return content;
  }
  return [content.trimEnd(), "", buildImplementationGuidance, ""].join("\n");
}
