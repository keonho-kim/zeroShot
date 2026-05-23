import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { ResourceFileSummary } from "@backend/types/resource";

function fileKind(path: string): ResourceFileSummary["kind"] {
  if (path.startsWith("references/")) {
    return "reference";
  }
  if (path.startsWith("assets/")) {
    return "asset";
  }
  if (path.startsWith("examples/")) {
    return "example";
  }
  return "other";
}

export async function listResourceFiles(root: string, current = root): Promise<ResourceFileSummary[]> {
  const entries = await readdir(current, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(entries
    .filter((entry) => !entry.name.startsWith("."))
    .map(async (entry) => {
      const absolutePath = join(current, entry.name);
      if (entry.isDirectory()) {
        return listResourceFiles(root, absolutePath);
      }
      const relativePath = relative(root, absolutePath).replace(/\\/g, "/");
      const info = await stat(absolutePath);
      return [{
        path: relativePath,
        kind: fileKind(relativePath),
        size: info.size
      }];
    }));
  return nested.flat();
}
