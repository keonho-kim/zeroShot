import { homedir } from "node:os";

export function expandHomePath(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "~") {
    return homedir();
  }
  if (trimmed.startsWith("~/") || trimmed.startsWith("~\\")) {
    return `${homedir()}${trimmed.slice(1)}`;
  }
  return trimmed;
}
