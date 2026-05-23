import { Buffer } from "node:buffer";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { architectProductPath, designEntryPath, readArtifactFile, readArtifactManifest } from "@backend/services/file/service";
import type { WorkflowLogRecordSummary, WorkflowLogSection, WorkflowLogStage } from "@backend/types/history";

function artifactRecordId(path: string): string {
  return `artifact:${Buffer.from(path).toString("base64url")}`;
}

export function decodeArtifactRecordId(id: string): string | null {
  if (!id.startsWith("artifact:")) {
    return null;
  }
  try {
    return Buffer.from(id.slice("artifact:".length), "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function artifactStage(path: string): { stage: WorkflowLogStage; section: WorkflowLogSection } | null {
  if (path === architectProductPath || path.startsWith("ARCHITECT/")) {
    return { stage: "product", section: "blueprint" };
  }
  if (path === designEntryPath || path.startsWith("DESIGN/")) {
    return { stage: "design", section: "preview" };
  }
  return null;
}

function isHtmlArtifact(path: string, type: string): boolean {
  return type === "text/html" || path.toLowerCase().endsWith(".html");
}

async function listHtmlFiles(projectRoot: string, relativeDir: string): Promise<string[]> {
  const entries = await readdir(join(projectRoot, relativeDir), { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(entries.map(async (entry) => {
    const relativePath = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      return listHtmlFiles(projectRoot, relativePath);
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      return [relativePath];
    }
    return [];
  }));
  return nested.flat();
}

export async function artifactRecords(projectRoot: string): Promise<WorkflowLogRecordSummary[]> {
  const manifest = await readArtifactManifest(projectRoot);
  const records: WorkflowLogRecordSummary[] = [];
  for (const artifact of manifest.artifacts) {
    if (!isHtmlArtifact(artifact.path, artifact.type)) {
      continue;
    }
    const location = artifactStage(artifact.path);
    if (!location) {
      continue;
    }
    records.push({
      id: artifactRecordId(artifact.path),
      projectRoot,
      stage: location.stage,
      section: location.section,
      kind: "artifact",
      title: artifact.title || artifact.path,
      summary: artifact.path,
      contentType: artifact.type,
      createdAt: artifact.updatedAt || artifact.createdAt,
      eventCount: 0
    });
  }

  const knownPaths = new Set(records.map((record) => record.summary));
  const architectHtmlFiles = await listHtmlFiles(projectRoot, "ARCHITECT");
  const designHtmlFiles = await listHtmlFiles(projectRoot, "DESIGN");
  const fallbackPaths = new Set([
    architectProductPath,
    designEntryPath,
    ...architectHtmlFiles,
    ...designHtmlFiles
  ]);
  for (const path of fallbackPaths) {
    if (knownPaths.has(path)) {
      continue;
    }
    const content = await readArtifactFile(projectRoot, path).catch(() => "");
    const location = artifactStage(path);
    if (!content.trim() || !location) {
      continue;
    }
    records.push({
      id: artifactRecordId(path),
      projectRoot,
      stage: location.stage,
      section: location.section,
      kind: "artifact",
      title: path,
      summary: path,
      contentType: "text/html",
      createdAt: new Date(0).toISOString(),
      eventCount: 0
    });
  }

  return records.sort((a, b) => Number(b.summary === architectProductPath || b.summary === designEntryPath) - Number(a.summary === architectProductPath || a.summary === designEntryPath)
    || b.createdAt.localeCompare(a.createdAt)
    || a.title.localeCompare(b.title));
}
