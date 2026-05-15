import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { loadAppConfig, saveAppConfig } from "@backend/config/app-config";

let configDir = "";
const originalConfigPath = process.env.ZEROSHOT_APP_CONFIG;
const originalBootstrapRoots = process.env.ZEROSHOT_BOOTSTRAP_ROOTS;

async function writeConfig(content: string): Promise<string> {
  configDir = await mkdtemp(join(tmpdir(), "zeroshot-app-config-"));
  const filePath = join(configDir, "zeroshot.app.toml");
  await writeFile(filePath, content, "utf8");
  process.env.ZEROSHOT_APP_CONFIG = filePath;
  return filePath;
}

afterEach(async () => {
  if (originalConfigPath === undefined) {
    delete process.env.ZEROSHOT_APP_CONFIG;
  } else {
    process.env.ZEROSHOT_APP_CONFIG = originalConfigPath;
  }

  if (originalBootstrapRoots === undefined) {
    delete process.env.ZEROSHOT_BOOTSTRAP_ROOTS;
  } else {
    process.env.ZEROSHOT_BOOTSTRAP_ROOTS = originalBootstrapRoots;
  }

  if (configDir) {
    await rm(configDir, { recursive: true, force: true });
    configDir = "";
  }
});

describe("app config", () => {
  test("uses the system home directory as the only bootstrap root", async () => {
    process.env.ZEROSHOT_BOOTSTRAP_ROOTS = "/tmp/ignored";
    await writeConfig(`
bootstrap_roots = ["/tmp/also-ignored"]
allowed_roots = ["~/zeroshot-projects"]
`);

    const config = await loadAppConfig();

    expect(config.bootstrapRoots).toEqual([homedir()]);
    expect(config.allowedRoots).toEqual([join(homedir(), "zeroshot-projects")]);
  });

  test("does not persist bootstrap_roots to app settings", async () => {
    const filePath = await writeConfig("allowed_roots = []\n");
    await mkdir(join(configDir, "workspace"), { recursive: true });

    await saveAppConfig({
      bootstrapRoots: ["/tmp/ignored"],
      allowedRoots: [join(configDir, "workspace")],
      resourceRoots: {
        skills: join(configDir, "skills"),
        designTemplates: join(configDir, "design-templates")
      },
      server: {
        host: "127.0.0.1",
        port: 17320
      },
      defaults: {
        approval: "never",
        sandbox: "workspace-write",
        maxIters: 30,
        stallLimit: 2,
        planReasoning: "high",
        execReasoning: "medium",
        validateReasoning: "medium",
        closeoutReasoning: "medium"
      }
    });

    expect(await readFile(filePath, "utf8")).not.toContain("bootstrap_roots");
  });

  test("creates a default user config when missing", async () => {
    configDir = await mkdtemp(join(tmpdir(), "zeroshot-app-config-"));
    const filePath = join(configDir, "config.toml");
    process.env.ZEROSHOT_APP_CONFIG = filePath;

    const config = await loadAppConfig();

    expect(config.server).toEqual({ host: "127.0.0.1", port: 17320 });
    expect(await readFile(filePath, "utf8")).toContain("host = \"127.0.0.1\"");
  });
});
