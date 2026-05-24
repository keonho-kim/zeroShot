import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { architectProductPath, designEntryPath } from "@backend/services/file/const/artifact-paths";
import { fileEtag } from "@backend/services/file/etag";
import { readProductHtml, writeDesignHtml, writeProductHtml } from "@backend/services/file/document";
import type { ProjectFileSnapshot } from "@backend/services/file/types";

async function readProjectFileSnapshot(projectRoot: string, relativePath: string, mime: string): Promise<ProjectFileSnapshot> {
  const path = join(projectRoot, relativePath);
  const [content, fileStats] = await Promise.all([
    readFile(path, "utf8"),
    stat(path)
  ]);
  return {
    path: relativePath,
    content,
    mime,
    etag: fileEtag(content, fileStats.mtimeMs),
    updatedAt: fileStats.mtime.toISOString()
  };
}

export async function readProductHtmlSnapshot(projectRoot: string): Promise<ProjectFileSnapshot> {
  return readProjectFileSnapshot(projectRoot, architectProductPath, "text/html");
}

export async function writeProductHtmlSnapshot(projectRoot: string, content: string, etag?: string): Promise<ProjectFileSnapshot> {
  if (etag) {
    const current = await readProductHtmlSnapshot(projectRoot);
    if (current.etag !== etag) {
      throw Object.assign(new Error("PRODUCT BLUEPRINT changed since it was loaded."), { statusCode: 409 });
    }
  }
  await writeProductHtml(projectRoot, content);
  return readProductHtmlSnapshot(projectRoot);
}

export async function readDesignHtmlSnapshot(projectRoot: string): Promise<ProjectFileSnapshot> {
  return readProjectFileSnapshot(projectRoot, designEntryPath, "text/html");
}

export async function writeDesignHtmlSnapshot(projectRoot: string, content: string, etag?: string): Promise<ProjectFileSnapshot> {
  if (etag) {
    const current = await readDesignHtmlSnapshot(projectRoot);
    if (current.etag !== etag) {
      throw Object.assign(new Error("DESIGN artifact changed since it was loaded."), { statusCode: 409 });
    }
  }
  await writeDesignHtml(projectRoot, content);
  return readDesignHtmlSnapshot(projectRoot);
}

export { readProductHtml };
