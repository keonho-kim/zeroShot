import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { loadAppConfig } from "@backend/config/app-config.js";
import { resourcePromptBlock } from "@backend/prompts/resources/resource-prompt.js";
import type { ResourceFileSummary, ResourceManifest } from "@backend/types.js";

type Frontmatter = Record<string, unknown>;

const frontmatterPattern = /^---\r?\n(?<frontmatter>[\s\S]*?)\r?\n---\r?\n?(?<body>[\s\S]*)$/;

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseList(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return [trimmed.replace(/^["']|["']$/g, "")];
}

function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const match = frontmatterPattern.exec(raw);
  if (!match?.groups) {
    return { frontmatter: {}, body: raw.trim() };
  }

  const frontmatter = Object.fromEntries(
    match.groups.frontmatter
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf(":");
        if (index === -1) {
          return ["", ""];
        }
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim();
        return [key, key === "tags" ? parseList(value) : value.replace(/^["']|["']$/g, "")];
      })
      .filter(([key]) => key)
  );

  return { frontmatter, body: match.groups.body.trim() };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

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

async function listFiles(root: string, current = root): Promise<ResourceFileSummary[]> {
  const entries = await readdir(current, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(entries
    .filter((entry) => !entry.name.startsWith("."))
    .map(async (entry) => {
      const absolutePath = join(current, entry.name);
      if (entry.isDirectory()) {
        return listFiles(root, absolutePath);
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

async function loadResource(root: string, directoryName: string): Promise<ResourceManifest | null> {
  const resourceRoot = join(root, directoryName);
  const manifestPath = join(resourceRoot, "SKILL.md");
  const raw = await readFile(manifestPath, "utf8").catch(() => "");
  if (!raw) {
    return null;
  }

  const { frontmatter, body } = parseFrontmatter(raw);
  const name = asString(frontmatter.name) || directoryName;
  const description = asString(frontmatter.description);

  return {
    id: slugify(directoryName || name),
    name,
    description,
    category: asString(frontmatter.category) || undefined,
    tags: asStringList(frontmatter.tags),
    root: resourceRoot,
    manifestPath,
    body,
    files: (await listFiles(resourceRoot)).filter((file) => file.path !== "SKILL.md")
  };
}

async function loadResources(root: string): Promise<ResourceManifest[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const resources = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => loadResource(root, entry.name))
  );
  return resources
    .filter((resource): resource is ResourceManifest => resource !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listResourceCatalog(): Promise<{ skills: ResourceManifest[]; designTemplates: ResourceManifest[] }> {
  const config = await loadAppConfig();
  const [skills, designTemplates] = await Promise.all([
    loadResources(config.resourceRoots.skills),
    loadResources(config.resourceRoots.designTemplates)
  ]);
  return { skills, designTemplates };
}

export async function buildResourcePromptContext(selection: {
  activeSkillId?: string;
  activeDesignTemplateId?: string;
}): Promise<string> {
  const catalog = await listResourceCatalog();
  const skill = selection.activeSkillId
    ? catalog.skills.find((resource) => resource.id === selection.activeSkillId)
    : undefined;
  const designTemplate = selection.activeDesignTemplateId
    ? catalog.designTemplates.find((resource) => resource.id === selection.activeDesignTemplateId)
    : undefined;

  return [
    resourcePromptBlock("Active Skill", skill),
    resourcePromptBlock("Active Design Template", designTemplate)
  ].filter(Boolean).join("\n\n");
}
