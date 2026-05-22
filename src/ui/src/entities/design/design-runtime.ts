import type { DesignRuntimeMode, DesignRuntimeResponse } from "@/types/api";

export interface DesignModeOption {
  id: DesignRuntimeMode;
  title: string;
  eyebrow: string;
  detail: string;
  output: string;
}

export const designModeOptions: DesignModeOption[] = [
  {
    id: "codex",
    title: "Codex Canvas",
    eyebrow: "GENERATE",
    detail: "Create implementable UI instructions from the product blueprint and design template.",
    output: "Design brief, artifact contract, verification plan"
  },
  {
    id: "figma",
    title: "Wireframe",
    eyebrow: "EDIT",
    detail: "Organize layout, component states, layer names, and prototype notes.",
    output: "Wireframe map, component checklist, handoff notes"
  },
  {
    id: "powerpoint",
    title: "Presentation",
    eyebrow: "EDIT",
    detail: "Plan slide flow, editorial hierarchy, chart and table placeholders, and presentation rhythm.",
    output: "Presentation sequence, editorial hierarchy, export checks"
  }
];

export function designModeLabel(mode: DesignRuntimeMode): string {
  return designModeOptions.find((option) => option.id === mode)?.title ?? "Codex Canvas";
}

export function designResultStatus(design: DesignRuntimeResponse | null | undefined): string {
  if (!design) {
    return "WAIT";
  }
  return designModeLabel(design.mode);
}
