import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export function getWorkspaceRoot(): string {
  let current = dirname(fileURLToPath(import.meta.url));
  while (true) {
    if (existsSync(join(current, "zeroshot.app.toml")) && existsSync(join(current, "package.json"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    }
    current = parent;
  }
}

export function getAppConfigPath(): string {
  return process.env.ZEROSHOT_APP_CONFIG ?? join(homedir(), ".zeroshot", "config.toml");
}

export function getScriptsRoot(): string {
  return resolve(getWorkspaceRoot(), "scripts");
}
