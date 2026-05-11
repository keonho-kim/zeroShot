import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { ensureFileContent, resolveExistingPath } from "../core/path-guards.js";

export async function writeProductOrUpdate(projectRoot: string, filename: "PRODUCT.md" | "UPDATE.md", content: string): Promise<void> {
  await ensureFileContent(join(projectRoot, filename), content);
}

export async function readProductHtml(projectRoot: string): Promise<string> {
  return readFile(join(projectRoot, "PRODUCT.html"), "utf8");
}

export async function writeProductHtml(projectRoot: string, content: string): Promise<void> {
  await ensureFileContent(join(projectRoot, "PRODUCT.html"), content);
}

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
