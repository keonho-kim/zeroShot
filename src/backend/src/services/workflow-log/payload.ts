export function parsePayload(raw: string | null): unknown | undefined {
  if (!raw) {
    return undefined;
  }
  return JSON.parse(raw) as unknown;
}
