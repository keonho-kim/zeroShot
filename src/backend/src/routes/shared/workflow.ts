export function workflowProgressMessage(event: { title?: string; detail?: string; status?: string }): string {
  return [event.title, event.detail, event.status].filter(Boolean).join(" · ");
}

export function workflowRawMessage(event: unknown): string {
  if (event && typeof event === "object" && "type" in event) {
    return String((event as { type?: unknown }).type ?? "raw");
  }
  return "raw";
}
