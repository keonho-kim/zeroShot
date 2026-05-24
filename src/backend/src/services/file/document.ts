import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureFileContent } from "@backend/core/path-guards";
import { architectProductPath, designEntryPath } from "@backend/services/file/const/artifact-paths";

export async function writeProjectDocument(projectRoot: string, filename: "UPDATE.md", content: string): Promise<void> {
  await ensureFileContent(join(projectRoot, filename), content);
}

export async function writeUpdateDocument(projectRoot: string, content: string): Promise<void> {
  await writeProjectDocument(projectRoot, "UPDATE.md", content);
}

export async function readProductHtml(projectRoot: string): Promise<string> {
  return readFile(join(projectRoot, architectProductPath), "utf8");
}

export async function writeProductHtml(projectRoot: string, content: string): Promise<void> {
  await ensureFileContent(join(projectRoot, architectProductPath), content);
}

export async function readDesignHtml(projectRoot: string): Promise<string> {
  return readFile(join(projectRoot, designEntryPath), "utf8");
}

export async function writeDesignHtml(projectRoot: string, content: string): Promise<void> {
  await ensureFileContent(join(projectRoot, designEntryPath), content);
}
