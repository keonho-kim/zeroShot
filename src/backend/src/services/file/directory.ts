import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { resolveExistingPath } from "@backend/core/path-guards";

function assertValidEntryName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "." || trimmed === ".." || /[\\/]/.test(trimmed)) {
    throw Object.assign(new Error("Invalid name"), { statusCode: 400 });
  }

  return trimmed;
}

export async function createDirectory(parentPath: string, name: string): Promise<string> {
  const validName = assertValidEntryName(name);
  const targetPath = join(parentPath, validName);
  await mkdir(targetPath);
  return resolveExistingPath(targetPath);
}

export async function deleteEntry(targetPath: string): Promise<void> {
  const stats = await stat(targetPath);
  await rm(targetPath, { recursive: stats.isDirectory(), force: false });
}
