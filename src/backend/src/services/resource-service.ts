import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { loadAppConfig } from "@backend/config/app-config.js";
import { resourcePromptBlock } from "@backend/prompts/resources/resource-prompt.js";
import { ensureResourceStoreSeeded } from "@backend/services/resource-seed-service.js";
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

function markdownTitle(body: string, fallback: string): string {
  return /^#\s+(?<title>.+)$/m.exec(body)?.groups?.title.trim() || fallback;
}

function markdownDescription(body: string): string {
  const paragraph = body
    .split(/\r?\n/)
    .map((line) => line.replace(/^>\s?/, "").trim())
    .find((line) => line && !line.startsWith("#") && !line.startsWith("-"));
  return paragraph ?? "";
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

async function loadResource(root: string, directoryName: string, manifestFileName: "SKILL.md" | "DESIGN.md"): Promise<ResourceManifest | null> {
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
    files: (await listFiles(resourceRoot)).filter((file) => file.path !== manifestFileName)
  };
}

async function loadResources(root: string, manifestFileName: "SKILL.md" | "DESIGN.md"): Promise<ResourceManifest[]> {
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

export async function buildResourcePromptContext(selection: {
  activeSkillId?: string;
  activeDesignTemplateId?: string;
  activeDesignSystemId?: string;
  includeCatalogSummary?: boolean;
}): Promise<string> {
  const catalog = await listResourceCatalog();
  const skill = selection.activeSkillId
    ? catalog.skills.find((resource) => resource.id === selection.activeSkillId)
    : undefined;
  const designTemplate = selection.activeDesignTemplateId
    ? catalog.designTemplates.find((resource) => resource.id === selection.activeDesignTemplateId)
    : undefined;
  const designSystem = selection.activeDesignSystemId
    ? catalog.designSystems.find((resource) => resource.id === selection.activeDesignSystemId)
    : undefined;

  return [
    selection.includeCatalogSummary ? resourceCatalogSummary(catalog) : "",
    resourcePromptBlock("Active Skill", skill),
    resourcePromptBlock("Active Design System", designSystem),
    resourcePromptBlock("Active Design Template", designTemplate)
  ].filter(Boolean).join("\n\n");
}

function summarizeResources(title: string, resources: ResourceManifest[]): string {
  if (!resources.length) {
    return `### ${title}\n- none`;
  }
  return [
    `### ${title}`,
    ...resources.slice(0, 120).map((resource) => `- ${resource.id}: ${resource.name}${resource.description ? ` - ${resource.description.replace(/\s+/g, " ").slice(0, 180)}` : ""}`)
  ].join("\n");
}

export function resourceCatalogSummary(catalog: {
  skills: ResourceManifest[];
  designTemplates: ResourceManifest[];
  designSystems: ResourceManifest[];
}): string {
  return [
    "## Available ZeroShot Resources",
    "Treat these bundled resources as read-only guidance. Select only the resources that fit the product instead of exposing every option to the user.",
    summarizeResources("Skills", catalog.skills),
    summarizeResources("Design Systems", catalog.designSystems),
    summarizeResources("Design Templates", catalog.designTemplates)
  ].join("\n\n");
}
