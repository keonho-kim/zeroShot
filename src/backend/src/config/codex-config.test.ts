import { parse } from "@iarna/toml";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getProjectCodexConfigPath, saveProjectCodexSettings } from "@backend/config/codex-config";

let originalHome = "";

beforeEach(() => {
  originalHome = process.env.HOME ?? "";
});

afterEach(() => {
  process.env.HOME = originalHome;
});

describe("codex config", () => {
  test("creates project Codex config and trusts the project", async () => {
    const home = await mkdtemp(join(tmpdir(), "zeroshot-codex-home-"));
    const projectRoot = await mkdtemp(join(tmpdir(), "zeroshot-codex-project-"));
    const userConfigPath = join(home, ".codex", "config.toml");

    const status = await saveProjectCodexSettings(projectRoot, userConfigPath);
    const projectRaw = parse(await readFile(getProjectCodexConfigPath(projectRoot), "utf8")) as Record<string, unknown>;
    const userRaw = parse(await readFile(join(home, ".codex", "config.toml"), "utf8")) as Record<string, unknown>;

    expect(status.exists).toBe(true);
    expect(status.trusted).toBe(true);
    expect(projectRaw.model).toBe("gpt-5.5");
    expect(projectRaw.model_reasoning_effort).toBe("high");
    expect(projectRaw.approval_policy).toBe("never");
    expect(projectRaw.sandbox_mode).toBe("danger-full-access");
    expect((projectRaw.features as Record<string, unknown>).goals).toBe(true);
    expect(((userRaw.projects as Record<string, Record<string, string>>)[projectRoot]).trust_level).toBe("trusted");
  });

  test("preserves unrelated project and user config keys", async () => {
    const home = await mkdtemp(join(tmpdir(), "zeroshot-codex-home-"));
    const projectRoot = await mkdtemp(join(tmpdir(), "zeroshot-codex-project-"));
    const userConfigPath = join(home, ".codex", "config.toml");

    await mkdir(join(projectRoot, ".codex"), { recursive: true });
    await writeFile(join(projectRoot, ".codex", "config.toml"), [
      "custom_key = \"keep\"",
      "",
      "[features]",
      "shell_snapshot = true",
      ""
    ].join("\n"), "utf8");
    await mkdir(join(home, ".codex"), { recursive: true });
    await writeFile(join(home, ".codex", "config.toml"), [
      "model = \"gpt-5.4\"",
      "",
      "[plugins.\"browser@openai-bundled\"]",
      "enabled = true",
      ""
    ].join("\n"), "utf8");

    await saveProjectCodexSettings(projectRoot, userConfigPath);

    const projectRaw = parse(await readFile(getProjectCodexConfigPath(projectRoot), "utf8")) as Record<string, unknown>;
    const userRaw = parse(await readFile(join(home, ".codex", "config.toml"), "utf8")) as Record<string, unknown>;

    expect(projectRaw.custom_key).toBe("keep");
    expect((projectRaw.features as Record<string, unknown>).shell_snapshot).toBe(true);
    expect((projectRaw.features as Record<string, unknown>).goals).toBe(true);
    expect(userRaw.model).toBe("gpt-5.4");
    expect(((userRaw.plugins as Record<string, Record<string, boolean>>)["browser@openai-bundled"]).enabled).toBe(true);
    expect(((userRaw.projects as Record<string, Record<string, string>>)[projectRoot]).trust_level).toBe("trusted");
  });
});
