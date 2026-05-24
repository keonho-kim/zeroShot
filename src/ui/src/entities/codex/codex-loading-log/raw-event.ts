export type RawCodexEvent = {
  type?: unknown;
  thread_id?: unknown;
  item?: Record<string, unknown>;
  message?: unknown;
  error?: { message?: unknown };
};

export function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

export function parseRawCodexEvent(value: string): RawCodexEvent | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? parsed as RawCodexEvent : null;
  } catch {
    return null;
  }
}

function decodeJsonStringContent(value: string): string {
  return value
    .replace(/\\\\/g, "\\")
    .replace(/\\"/g, "\"")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

export function extractJsonField(raw: string, fieldName: string): string {
  const fieldIndex = raw.indexOf(`"${fieldName}"`);
  if (fieldIndex < 0) {
    return "";
  }
  const colonIndex = raw.indexOf(":", fieldIndex + fieldName.length + 2);
  if (colonIndex < 0) {
    return "";
  }
  const quoteIndex = raw.indexOf("\"", colonIndex + 1);
  if (quoteIndex < 0) {
    return "";
  }

  let escaped = false;
  let content = "";
  for (let index = quoteIndex + 1; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) {
      content += `\\${char}`;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      try {
        return JSON.parse(`"${content}"`) as string;
      } catch {
        return decodeJsonStringContent(content);
      }
    }
    content += char;
  }

  return decodeJsonStringContent(content);
}
