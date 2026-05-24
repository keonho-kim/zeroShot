import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listResourceCatalog } from "@backend/services/resource/service";

let tempRoot = "";
const originalConfigPath = process.env.ZEROSHOT_APP_CONFIG;
const originalDataRoot = process.env.ZEROSHOT_DATA_ROOT;
const originalResourceSourceRoot = process.env.ZEROSHOT_RESOURCE_SOURCE_ROOT;

afterEach(async () => {
  if (originalConfigPath === undefined) {
    delete process.env.ZEROSHOT_APP_CONFIG;
  } else {
    process.env.ZEROSHOT_APP_CONFIG = originalConfigPath;
  }
  if (originalDataRoot === undefined) {
    delete process.env.ZEROSHOT_DATA_ROOT;
  } else {
    process.env.ZEROSHOT_DATA_ROOT = originalDataRoot;
  }
  if (originalResourceSourceRoot === undefined) {
    delete process.env.ZEROSHOT_RESOURCE_SOURCE_ROOT;
  } else {
    process.env.ZEROSHOT_RESOURCE_SOURCE_ROOT = originalResourceSourceRoot;
  }

  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  }
});

describe("resource service", () => {
  test("loads skills and design templates from configured ZeroShot roots", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "zeroshot-resources-"));
    const skillsRoot = join(tempRoot, "skills");
    const templatesRoot = join(tempRoot, "design-templates");
    const systemsRoot = join(tempRoot, "design-systems");
    const configPath = join(tempRoot, "config.toml");

    await mkdir(join(skillsRoot, "web-app", "references"), { recursive: true });
    await mkdir(join(templatesRoot, "dashboard"), { recursive: true });
    await mkdir(join(systemsRoot, "neutral"), { recursive: true });
    await writeFile(configPath, `
allowed_roots = []
[resource_roots]
skills = "${skillsRoot}"
design_templates = "${templatesRoot}"
design_systems = "${systemsRoot}"
`, "utf8");
    await writeFile(join(skillsRoot, "web-app", "SKILL.md"), `---
name: Web App
description: Builds focused web apps
category: product
tags: [web, app]
---
Use direct product workflows.
`, "utf8");
    await writeFile(join(skillsRoot, "web-app", "references", "checklist.md"), "Check flows.", "utf8");
    await writeFile(join(templatesRoot, "dashboard", "SKILL.md"), `---
name: Dashboard
description: Dense operational dashboard
---
Use compact metrics.
`, "utf8");
    await writeFile(join(systemsRoot, "neutral", "DESIGN.md"), `# Neutral Modern

> Category: Starter
> A clean product-oriented default.
`, "utf8");
    process.env.ZEROSHOT_APP_CONFIG = configPath;

    const catalog = await listResourceCatalog();

    expect(catalog.skills[0].id).toBe("web-app");
    expect(catalog.skills[0].tags).toEqual(["web", "app"]);
    expect(catalog.skills[0].files.some((file) => file.kind === "reference")).toBe(true);
    expect(catalog.designTemplates[0].id).toBe("dashboard");
    expect(catalog.designSystems[0].id).toBe("neutral");
    expect(catalog.designSystems[0].name).toBe("Neutral Modern");
  });

  test("seeds bundled resources into the managed ZeroShot store", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "zeroshot-resource-seed-"));
    const sourceRoot = join(tempRoot, "source-files");
    const dataRoot = join(tempRoot, "data");
    const configPath = join(dataRoot, "config.toml");

    await mkdir(dataRoot, { recursive: true });
    await mkdir(join(sourceRoot, "skills", "web-app"), { recursive: true });
    await mkdir(join(sourceRoot, "design-templates", "dashboard"), { recursive: true });
    await mkdir(join(sourceRoot, "design-systems", "neutral"), { recursive: true });
    await writeFile(join(sourceRoot, "skills", "web-app", "SKILL.md"), "# Web App\n", "utf8");
    await writeFile(join(sourceRoot, "design-templates", "dashboard", "SKILL.md"), "# Dashboard\n", "utf8");
    await writeFile(join(sourceRoot, "design-systems", "neutral", "DESIGN.md"), "# Neutral Modern\n", "utf8");
    await writeFile(configPath, `
allowed_roots = []
[resource_roots]
skills = "${join(dataRoot, "skills")}"
design_templates = "${join(dataRoot, "design-templates")}"
design_systems = "${join(dataRoot, "design-systems")}"
`, "utf8");

    process.env.ZEROSHOT_APP_CONFIG = configPath;
    process.env.ZEROSHOT_DATA_ROOT = dataRoot;
    process.env.ZEROSHOT_RESOURCE_SOURCE_ROOT = sourceRoot;

    const catalog = await listResourceCatalog();

    expect(catalog.skills[0].id).toBe("web-app");
    expect(catalog.designTemplates[0].id).toBe("dashboard");
    expect(catalog.designSystems[0].id).toBe("neutral");
    expect(await readFile(join(dataRoot, "design-systems", "neutral", "DESIGN.md"), "utf8")).toContain("Neutral Modern");
  });
});
