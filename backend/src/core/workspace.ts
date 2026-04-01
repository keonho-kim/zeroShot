import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export function getWorkspaceRoot(): string {
  const current = dirname(fileURLToPath(import.meta.url));
  return resolve(current, "../../..");
}

export function getAppConfigPath(): string {
  return process.env.ZEROSHOT_APP_CONFIG ?? resolve(getWorkspaceRoot(), "zeroshot.app.toml");
}

export function getScriptsRoot(): string {
  return resolve(getWorkspaceRoot(), "scripts");
}
