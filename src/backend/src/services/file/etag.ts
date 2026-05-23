import { createHash } from "node:crypto";

export function fileEtag(content: string, mtimeMs: number): string {
  const hash = createHash("sha256")
    .update(content)
    .update(String(Math.round(mtimeMs)))
    .digest("base64url")
    .slice(0, 32);
  return `"${hash}"`;
}
