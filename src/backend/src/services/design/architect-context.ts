import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { architectProductPath } from "@backend/services/file/service";

export async function readArchitectContext(projectRoot: string): Promise<string> {
  const architectRoot = join(projectRoot, "ARCHITECT");
  const files: Array<{ path: string; content: string }> = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const absolute = join(directory, entry.name);
      const relativePath = relative(projectRoot, absolute).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        if (entry.name !== "assets") {
          await visit(absolute);
        }
        continue;
      }
      if (!entry.isFile() || !/\.(html|css|js|json|md)$/i.test(entry.name)) {
        continue;
      }
      const info = await stat(absolute).catch(() => null);
      if (!info || info.size > 100_000) {
        continue;
      }
      files.push({
        path: relativePath,
        content: await readFile(absolute, "utf8")
      });
    }
  }

  await visit(architectRoot);
  return files.length
    ? files.map((file) => `--- ${file.path} ---\n${file.content}`).join("\n\n")
    : `No ARCHITECT files were found. Expected ${architectProductPath}.`;
}
