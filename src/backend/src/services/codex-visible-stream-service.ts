import type { Thread, ThreadEvent } from "@openai/codex-sdk";
import { textByLocale } from "@backend/i18n/locale.js";

export interface VisibleCodexProgressEvent {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed" | "failed";
}

export function compactVisibleContext(value: string, maxLength = 4000): string {
  const normalized = value.trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}\n…` : normalized;
}

export function visiblePreludePrompt(params: {
  locale: string;
  workflow: string;
  task: string;
}): string {
  const language = textByLocale(params.locale, {
    ko: "Korean",
    en: "English",
    zh: "Chinese",
    ja: "Japanese",
    es: "Spanish",
    de: "German"
  });

  return [
    `You are starting the ${params.workflow} workflow.`,
    `Respond in ${language}.`,
    "Use available read-only tools broadly when they can improve accuracy: inspect workspace files, product/design documents, source structure, provided resource context, or web/search tools available to you.",
    "Do not edit files or make persistent changes.",
    "Write one short user-facing work note after any useful inspection.",
    "Keep the note to one or two sentences. Do not list final choices or full option sets in this note.",
    "Describe the concrete product files, UI artifacts, implementation context, or decision axis you just reviewed.",
    "Do not include local absolute paths or Markdown links. Refer to files by short names such as README.md.",
    "Do not output JSON, code fences, final artifacts, or hidden reasoning.",
    "Keep the note concise and natural.",
    "",
    "Task:",
    params.task
  ].join("\n");
}

export async function streamVisibleCodexPrelude(params: {
  thread: Thread;
  prompt: string;
  describeProgress: (event: ThreadEvent) => VisibleCodexProgressEvent | null;
  onProgress?: (event: VisibleCodexProgressEvent) => void | Promise<void>;
  onMessage?: (message: string) => void | Promise<void>;
  onRaw?: (event: ThreadEvent) => void | Promise<void>;
}): Promise<void> {
  const { events } = await params.thread.runStreamed(params.prompt);
  let lastMessage = "";

  for await (const event of events) {
    await params.onRaw?.(event);

    const progress = params.describeProgress(event);
    if (progress) {
      await params.onProgress?.(progress);
    }

    if ((event.type === "item.updated" || event.type === "item.completed") && event.item.type === "agent_message") {
      const nextMessage = event.item.text.trim();
      if (nextMessage && nextMessage !== lastMessage) {
        lastMessage = nextMessage;
        await params.onMessage?.(nextMessage);
      }
    }

    if (event.type === "turn.failed") {
      throw new Error(event.error.message);
    }
    if (event.type === "error") {
      throw new Error(event.message);
    }
  }
}
