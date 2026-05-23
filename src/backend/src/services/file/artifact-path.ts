import { isAbsolute } from "node:path";

export function assertValidArtifactPath(path: string): string {
  const normalized = path.trim().replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || normalized.includes("\0") || normalized.split("/").includes("..") || isAbsolute(normalized) || /^[a-zA-Z]:\//.test(normalized)) {
    throw Object.assign(new Error("Invalid artifact path"), { statusCode: 400 });
  }
  return normalized;
}
