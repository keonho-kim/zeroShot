import { cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, relative, resolve, join } from "node:path";
import { getAppDataRoot, getWorkspaceRoot } from "@backend/core/workspace.js";
import type { AppConfig } from "@backend/types.js";

const seededKeys = new Set<string>();

function isWithin(child: string, parent: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith("/") && !rel.match(/^[A-Za-z]:/));
}

async function directoryExists(path: string): Promise<boolean> {
  const info = await stat(path).catch(() => null);
  return Boolean(info?.isDirectory());
}

export async function findBundledResourceSourceRoot(): Promise<string> {
  const configured = process.env.ZEROSHOT_RESOURCE_SOURCE_ROOT;
  if (configured && await directoryExists(configured)) {
    return resolve(configured);
  }

  const workspaceSource = join(getWorkspaceRoot(), "system-asseets", "design", "source-files");
  if (await directoryExists(workspaceSource)) {
    return workspaceSource;
  }

  return "";
}

async function mirrorManagedDirectory(source: string, target: string): Promise<void> {
  const dataRoot = getAppDataRoot();
  const resolvedSource = resolve(source);
  const resolvedTarget = resolve(target);
  if (resolvedSource === resolvedTarget || !isWithin(resolvedTarget, dataRoot)) {
    return;
  }
  if (!(await directoryExists(resolvedSource))) {
    return;
  }

  const seedKey = `${resolvedSource}=>${resolvedTarget}`;
  if (seededKeys.has(seedKey)) {
    return;
  }

  await rm(resolvedTarget, { recursive: true, force: true });
  await mkdir(dirname(resolvedTarget), { recursive: true });
  await cp(resolvedSource, resolvedTarget, { recursive: true });
  seededKeys.add(seedKey);
}

export async function ensureResourceStoreSeeded(config: AppConfig): Promise<void> {
  const sourceRoot = await findBundledResourceSourceRoot();
  if (!sourceRoot) {
    return;
  }

  await Promise.all([
    mirrorManagedDirectory(join(sourceRoot, "skills"), config.resourceRoots.skills),
    mirrorManagedDirectory(join(sourceRoot, "design-templates"), config.resourceRoots.designTemplates),
    mirrorManagedDirectory(join(sourceRoot, "design-systems"), config.resourceRoots.designSystems)
  ]);
}
