import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ensureFileContent, listDirectoryEntries, readUtf8, resolveExistingPath, resolveUserFilePath } from "../core/path-guards.js";
import type { FileReadResult } from "../types.js";

export async function readProjectFile(projectRoot: string, relativePath = ""): Promise<FileReadResult> {
  const absolutePath = relativePath ? await resolveUserFilePath(projectRoot, relativePath) : projectRoot;
  const stats = await stat(absolutePath);

  if (stats.isDirectory()) {
    return {
      kind: "directory",
      path: relativePath,
      entries: await listDirectoryEntries(projectRoot, absolutePath, { includeFiles: true, hideWorkHistory: true })
    };
  }

  return {
    kind: "file",
    path: relativePath,
    content: await readUtf8(absolutePath)
  };
}

export async function saveProjectFile(projectRoot: string, relativePath: string, content: string): Promise<void> {
  const absolutePath = await resolveUserFilePath(projectRoot, relativePath);
  await ensureFileContent(absolutePath, content);
}

export async function writeProductOrUpdate(projectRoot: string, filename: "PRODUCT.md" | "UPDATE.md", content: string): Promise<void> {
  await ensureFileContent(join(projectRoot, filename), content);
}

function assertValidEntryName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "." || trimmed === ".." || /[\\/]/.test(trimmed)) {
    throw Object.assign(new Error("Invalid name"), { statusCode: 400 });
  }

  return trimmed;
}

async function ensureTargetMissing(targetPath: string): Promise<void> {
  try {
    await stat(targetPath);
    const error = new Error("Entry already exists") as NodeJS.ErrnoException & { statusCode?: number };
    error.code = "EEXIST";
    throw error;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

export async function createDirectory(parentPath: string, name: string): Promise<string> {
  const validName = assertValidEntryName(name);

  const targetPath = join(parentPath, validName);
  await mkdir(targetPath);
  return resolveExistingPath(targetPath);
}

export async function createFile(parentPath: string, name: string): Promise<string> {
  const validName = assertValidEntryName(name);
  const targetPath = join(parentPath, validName);
  await ensureTargetMissing(targetPath);
  await writeFile(targetPath, "", { encoding: "utf8", flag: "wx" });
  return resolveExistingPath(targetPath);
}

export async function renameEntry(targetPath: string, name: string): Promise<string> {
  const validName = assertValidEntryName(name);
  const nextPath = join(dirname(targetPath), validName);
  await ensureTargetMissing(nextPath);
  await rename(targetPath, nextPath);
  return resolveExistingPath(nextPath);
}

export async function deleteEntry(targetPath: string): Promise<void> {
  const stats = await stat(targetPath);
  await rm(targetPath, { recursive: stats.isDirectory(), force: false });
}
