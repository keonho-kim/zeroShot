import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureFileContent } from "@backend/core/path-guards";
import { assertValidArtifactPath } from "@backend/services/file/artifact-path";
import type { ArtifactManifest, ArtifactManifestEntry } from "@backend/services/file/types";

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
