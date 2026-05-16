import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listResourceCatalog } from "@backend/services/resource-service";

let tempRoot = "";
const originalConfigPath = process.env.ZEROSHOT_APP_CONFIG;

afterEach(async () => {
  if (originalConfigPath === undefined) {
    delete process.env.ZEROSHOT_APP_CONFIG;
  } else {
    process.env.ZEROSHOT_APP_CONFIG = originalConfigPath;
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
    const configPath = join(tempRoot, "config.toml");

    await mkdir(join(skillsRoot, "web-app", "references"), { recursive: true });
    await mkdir(join(templatesRoot, "dashboard"), { recursive: true });
    await writeFile(configPath, `
allowed_roots = []
[resource_roots]
skills = "${skillsRoot}"
design_templates = "${templatesRoot}"
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
    process.env.ZEROSHOT_APP_CONFIG = configPath;

    const catalog = await listResourceCatalog();

    expect(catalog.skills[0].id).toBe("web-app");
    expect(catalog.skills[0].tags).toEqual(["web", "app"]);
    expect(catalog.skills[0].files.some((file) => file.kind === "reference")).toBe(true);
    expect(catalog.designTemplates[0].id).toBe("dashboard");
  });
});
