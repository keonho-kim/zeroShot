export function parseStreamEvent(raw: string): { event: string; data: unknown } | null {
  const event = raw.split("\n").find((line) => line.startsWith("event: "))?.slice(7).trim();
  const data = raw
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice(6))
    .join("\n");

  if (!event || !data) {
    return null;
  }

  return { event, data: JSON.parse(data) as unknown };
}

export function formatRawCodexEvent(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? String(value);
}

export async function readApiStream<T>(
  response: Response,
  unavailableMessage: string,
  endedMessage: string,
  onEvent: (event: string, data: unknown) => T | undefined
): Promise<T> {
  if (!response.body) {
    throw new Error(unavailableMessage);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const parsed = parseStreamEvent(part);
      if (!parsed) {
        continue;
      }
      const result = onEvent(parsed.event, parsed.data);
      if (result !== undefined) {
        return result;
      }
    }

    if (done) {
      break;
    }
  }

  throw new Error(endedMessage);
}

export async function postStream<T>(
  path: string,
  payload: unknown,
  requestErrorMessage: string,
  unavailableMessage: string,
  endedMessage: string,
  onEvent: (event: string, data: unknown) => T | undefined
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || requestErrorMessage);
  }

  return readApiStream(response, unavailableMessage, endedMessage, onEvent);
}
