import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadAppConfig } from "@backend/config/app-config";
import { ResourceManifestFileName } from "@backend/services/resource/const/manifest";
import { listResourceFiles } from "@backend/services/resource/files";
import {
  asString,
  asStringList,
  markdownDescription,
  markdownTitle,
  parseFrontmatter,
  slugify
} from "@backend/services/resource/frontmatter";
import { ensureResourceStoreSeeded } from "@backend/services/resource/seed";
import type { ResourceManifest } from "@backend/types/resource";

async function loadResource(root: string, directoryName: string, manifestFileName: ResourceManifestFileName): Promise<ResourceManifest | null> {
  const resourceRoot = join(root, directoryName);
  const manifestPath = join(resourceRoot, manifestFileName);
  const raw = await readFile(manifestPath, "utf8").catch(() => "");
  if (!raw) {
    return null;
  }

  const { frontmatter, body } = parseFrontmatter(raw);
  const name = asString(frontmatter.name) || markdownTitle(body, directoryName);
  const description = asString(frontmatter.description) || markdownDescription(body);

  return {
    id: slugify(directoryName || name),
    name,
    description,
    category: asString(frontmatter.category) || undefined,
    tags: asStringList(frontmatter.tags),
    root: resourceRoot,
    manifestPath,
    body,
    files: (await listResourceFiles(resourceRoot)).filter((file) => file.path !== manifestFileName)
  };
}

async function loadResources(root: string, manifestFileName: ResourceManifestFileName): Promise<ResourceManifest[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const resources = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => loadResource(root, entry.name, manifestFileName))
  );
  return resources
    .filter((resource): resource is ResourceManifest => resource !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listResourceCatalog(): Promise<{ skills: ResourceManifest[]; designTemplates: ResourceManifest[]; designSystems: ResourceManifest[] }> {
  const config = await loadAppConfig();
  await ensureResourceStoreSeeded(config);
  const [skills, designTemplates, designSystems] = await Promise.all([
    loadResources(config.resourceRoots.skills, "SKILL.md"),
    loadResources(config.resourceRoots.designTemplates, "SKILL.md"),
    loadResources(config.resourceRoots.designSystems, "DESIGN.md")
  ]);
  return { skills, designTemplates, designSystems };
}
