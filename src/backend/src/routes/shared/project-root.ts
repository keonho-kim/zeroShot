import { relative } from "node:path";
import { loadAppConfig } from "@backend/config/app-config";
import { assertProjectRootWithinRoots } from "@backend/core/path-guards";

export type LoadedAppConfig = Awaited<ReturnType<typeof loadAppConfig>>;

export async function getValidatedProjectRoot(projectRoot: string): Promise<string> {
  const config = await loadAppConfig();
  return assertProjectRootWithinRoots(projectRoot, getBrowsableRoots(config), "browsable roots");
}

export function getBrowsableRoots(config: LoadedAppConfig): string[] {
  return Array.from(new Set([...config.bootstrapRoots, ...config.allowedRoots]));
}

export function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\.$/, "");
}

export function getRelativeProjectPath(projectRoot: string, absolutePath: string): string {
  return normalizeRelativePath(relative(projectRoot, absolutePath));
}
