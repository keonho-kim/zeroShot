import { realpath, readdir, readFile, stat, writeFile, mkdir, lstat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import type { DirectoryEntry } from "../types.js";

function normalize(path: string): string {
  return path.replace(/\\/g, "/");
}

export async function resolveExistingPath(targetPath: string): Promise<string> {
  return realpath(targetPath);
}

export function isWithin(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !rel.includes("/../") && rel !== "..");
}

export async function assertAllowedProjectRoot(targetPath: string, allowedRoots: string[]): Promise<string> {
  const resolvedTarget = await resolveExistingPath(targetPath);
  const resolvedRoots = await Promise.all(allowedRoots.map((entry) => resolveExistingPath(entry)));

  if (!resolvedRoots.some((root) => isWithin(root, resolvedTarget))) {
    throw Object.assign(new Error("Path is outside allowed roots"), { statusCode: 403 });
  }

  return resolvedTarget;
}

export async function resolveUserFilePath(projectRoot: string, userRelativePath = ""): Promise<string> {
  const sanitized = userRelativePath.replace(/^\/+/, "");
  if (sanitized.startsWith(".work.history")) {
    throw Object.assign(new Error(".work.history is not editable through the editor API"), { statusCode: 403 });
  }

  const absolute = resolve(projectRoot, sanitized);
  const realBase = await resolveExistingPath(projectRoot);

  const parent = await resolveExistingPath(dirname(absolute));
  if (!isWithin(realBase, parent) || normalize(relative(realBase, absolute)).startsWith("../")) {
    throw Object.assign(new Error("Path escapes project root"), { statusCode: 403 });
  }

  return absolute;
}

export async function listDirectoryEntries(
  rootPath: string,
  currentPath: string,
  options?: { directoriesOnly?: boolean; includeFiles?: boolean; hideWorkHistory?: boolean }
): Promise<DirectoryEntry[]> {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const rootReal = await resolveExistingPath(rootPath);

  const mapped = await Promise.all(
    entries.map(async (entry) => {
      if (options?.hideWorkHistory && entry.name === ".work.history") {
        return null;
      }
      if (entry.name === ".git" || entry.name === "node_modules") {
        return null;
      }

      const absolute = join(currentPath, entry.name);
      const stats = await lstat(absolute);
      const isDirectory = stats.isDirectory();

      if (options?.directoriesOnly && !isDirectory) {
        return null;
      }
      if (options?.includeFiles === false && !isDirectory) {
        return null;
      }

      return {
        name: entry.name,
        path: absolute,
        relativePath: normalize(relative(rootReal, absolute)),
        isDirectory
      } satisfies DirectoryEntry;
    })
  );

  return mapped
    .filter((entry): entry is DirectoryEntry => entry !== null)
    .sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name));
}

export async function ensureFileContent(targetPath: string, content: string): Promise<void> {
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content, "utf8");
}

export async function readUtf8(targetPath: string): Promise<string> {
  return readFile(targetPath, "utf8");
}

export async function exists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}
