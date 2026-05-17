import type { DirectoryEntry } from "@/types/api";

export function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: { data?: unknown } }).response?.data &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === "string"
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function entrySignature(entry: DirectoryEntry): string {
  return [
    entry.path,
    entry.isDirectory ? "d" : "f",
    entry.isAllowedRoot ? "a" : "",
    entry.hasWorkHistory ? "h" : "",
    entry.runsCount ?? 0
  ].join("|");
}

function entriesSignature(entries: DirectoryEntry[]): string {
  return entries.map(entrySignature).join("::");
}

export function prioritizeSelectedDirectory(entries: DirectoryEntry[], selectedPath: string): DirectoryEntry[] {
  if (!selectedPath) {
    return entries;
  }

  const selectedIndex = entries.findIndex((entry) => entry.isDirectory && entry.path === selectedPath);
  if (selectedIndex <= 0) {
    return entries;
  }

  return [
    entries[selectedIndex],
    ...entries.slice(0, selectedIndex),
    ...entries.slice(selectedIndex + 1)
  ];
}

export function mergeTreeChildren(
  treeChildrenByPath: Record<string, DirectoryEntry[]>,
  path: string,
  entries: DirectoryEntry[]
): Record<string, DirectoryEntry[]> {
  const hasCurrent = Object.hasOwn(treeChildrenByPath, path);
  const current = hasCurrent ? treeChildrenByPath[path] : [];
  if (hasCurrent && entriesSignature(current) === entriesSignature(entries)) {
    return treeChildrenByPath;
  }

  return {
    ...treeChildrenByPath,
    [path]: entries
  };
}
