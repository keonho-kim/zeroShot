import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureFileContent } from "@backend/core/path-guards";
import { assertValidArtifactPath } from "@backend/services/file/artifact-path";

export async function writeArtifactFile(projectRoot: string, relativePath: string, content: string): Promise<void> {
  const safePath = assertValidArtifactPath(relativePath);
  await ensureFileContent(join(projectRoot, safePath), content);
}

export async function readArtifactFile(projectRoot: string, relativePath: string): Promise<string> {
  const safePath = assertValidArtifactPath(relativePath);
  return readFile(join(projectRoot, safePath), "utf8");
}
