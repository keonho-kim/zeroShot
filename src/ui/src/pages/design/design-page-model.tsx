import { Frame, Presentation, Sparkles } from "lucide-react";
import type { DesignProgressEvent, DesignRuntimeMode, ResourceManifest } from "@/types/api";

export interface DesignTimelineItem extends DesignProgressEvent {
  updates: string[];
}

export function upsertTimelineItem(items: DesignTimelineItem[], event: DesignProgressEvent): DesignTimelineItem[] {
  const index = items.findIndex((item) => item.id === event.id);
  if (index === -1) {
    return [...items, { ...event, updates: [event.detail] }];
  }

  return items.map((item, itemIndex) => {
    if (itemIndex !== index) {
      return item;
    }
    const updates = item.updates[item.updates.length - 1] === event.detail
      ? item.updates
      : [...item.updates, event.detail];
    return { ...item, ...event, updates };
  });
}

export function projectName(projectRoot: string): string {
  return projectRoot.split("/").filter(Boolean).at(-1) || projectRoot;
}

export function resourceName(resources: ResourceManifest[], id: string): string {
  return resources.find((resource) => resource.id === id)?.name ?? "Default";
}

export function modeIcon(mode: DesignRuntimeMode) {
  if (mode === "figma") {
    return <Frame aria-hidden="true" />;
  }
  if (mode === "powerpoint") {
    return <Presentation aria-hidden="true" />;
  }
  return <Sparkles aria-hidden="true" />;
}
