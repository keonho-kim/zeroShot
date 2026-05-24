export function formatProjectPath(path: string): string {
  return path.replace(/^\/Users\/[^/]+/, "~");
}

export function formatWorkflowDate(value?: string): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function workflowProjectTitle(projectRoot: string): string {
  return projectRoot.split("/").filter(Boolean).at(-1) || projectRoot;
}

export function selectedWorkflowAnswerLabel(payload: unknown, decisionId: string): string {
  if (!payload || typeof payload !== "object" || !("answers" in payload)) {
    return "";
  }
  const answers = (payload as { answers?: Record<string, string> }).answers ?? {};
  return answers[decisionId] ?? "";
}
