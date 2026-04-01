import { stat } from "node:fs/promises";
import { join } from "node:path";
import { ensureFileContent, listDirectoryEntries, readUtf8, resolveUserFilePath } from "../core/path-guards.js";
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
