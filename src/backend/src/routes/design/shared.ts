import type { DesignRuntimeMode } from "@backend/types/design";

export function toDesignRuntimeMode(value: unknown): DesignRuntimeMode {
  if (value === "figma" || value === "powerpoint") {
    return value;
  }
  return "codex";
}
