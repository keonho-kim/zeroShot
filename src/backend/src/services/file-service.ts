import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { ensureFileContent, resolveExistingPath } from "@backend/core/path-guards";

export const architectProductPath = "ARCHITECT/PRODUCT.html";
export const designEntryPath = "DESIGN/index.html";

export interface ArtifactManifestEntry {
  path: string;
  type: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  entry?: boolean;
}

export interface ArtifactManifest {
  artifacts: ArtifactManifestEntry[];
}

export interface ProjectFileSnapshot {
  path: string;
  content: string;
  mime: string;
  etag: string;
  updatedAt: string;
}

export async function writeProjectDocument(projectRoot: string, filename: "UPDATE.md", content: string): Promise<void> {
  await ensureFileContent(join(projectRoot, filename), content);
}

export async function writeUpdateDocument(projectRoot: string, content: string): Promise<void> {
  await writeProjectDocument(projectRoot, "UPDATE.md", content);
}

export async function readProductHtml(projectRoot: string): Promise<string> {
  return readFile(join(projectRoot, architectProductPath), "utf8");
}

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

export async function writeProductHtml(projectRoot: string, content: string): Promise<void> {
  await ensureFileContent(join(projectRoot, architectProductPath), content);
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

export async function readDesignHtml(projectRoot: string): Promise<string> {
  return readFile(join(projectRoot, designEntryPath), "utf8");
}

export async function readDesignHtmlSnapshot(projectRoot: string): Promise<ProjectFileSnapshot> {
  return readProjectFileSnapshot(projectRoot, designEntryPath, "text/html");
}

export async function writeDesignHtml(projectRoot: string, content: string): Promise<void> {
  await ensureFileContent(join(projectRoot, designEntryPath), content);
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

export async function writeArtifactFile(projectRoot: string, relativePath: string, content: string): Promise<void> {
  const safePath = assertValidArtifactPath(relativePath);
  await ensureFileContent(join(projectRoot, safePath), content);
}

export async function readArtifactFile(projectRoot: string, relativePath: string): Promise<string> {
  const safePath = assertValidArtifactPath(relativePath);
  return readFile(join(projectRoot, safePath), "utf8");
}

export async function readArtifactManifest(projectRoot: string): Promise<ArtifactManifest> {
  try {
    const raw = await readFile(join(projectRoot, "artifacts.json"), "utf8");
    const parsed = JSON.parse(raw) as ArtifactManifest;
    return {
      artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts.filter(isArtifactManifestEntry) : []
    };
  } catch {
    return { artifacts: [] };
  }
}

export async function upsertArtifactManifest(
  projectRoot: string,
  entries: Array<{ path: string; type: string; title: string; entry?: boolean }>
): Promise<ArtifactManifest> {
  const now = new Date().toISOString();
  const current = await readArtifactManifest(projectRoot);
  const artifacts = new Map(current.artifacts.map((artifact) => [artifact.path, artifact]));

  for (const entry of entries) {
    const safePath = assertValidArtifactPath(entry.path);
    const previous = artifacts.get(safePath);
    artifacts.set(safePath, {
      path: safePath,
      type: entry.type,
      title: entry.title,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      ...(entry.entry ? { entry: true } : {})
    });
  }

  const manifest = { artifacts: Array.from(artifacts.values()).sort((a, b) => a.path.localeCompare(b.path)) };
  await ensureFileContent(join(projectRoot, "artifacts.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
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

function assertValidArtifactPath(path: string): string {
  const normalized = path.trim().replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || normalized.includes("\0") || normalized.split("/").includes("..") || isAbsolute(normalized) || /^[a-zA-Z]:\//.test(normalized)) {
    throw Object.assign(new Error("Invalid artifact path"), { statusCode: 400 });
  }
  return normalized;
}

function isArtifactManifestEntry(value: unknown): value is ArtifactManifestEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as Partial<ArtifactManifestEntry>;
  return typeof entry.path === "string"
    && typeof entry.type === "string"
    && typeof entry.title === "string"
    && typeof entry.createdAt === "string"
    && typeof entry.updatedAt === "string";
}

function fileEtag(content: string, mtimeMs: number): string {
  const hash = createHash("sha256")
    .update(content)
    .update(String(Math.round(mtimeMs)))
    .digest("base64url")
    .slice(0, 32);
  return `"${hash}"`;
}
