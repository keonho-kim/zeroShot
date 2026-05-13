import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { AuthStatus } from "@backend/types.js";

export function getAuthPath(): string {
  return join(homedir(), ".codex", "auth.json");
}

export async function readAuthStatus(): Promise<AuthStatus> {
  const path = getAuthPath();

  try {
    const raw = await readFile(path, "utf8");
    JSON.parse(raw);
    return {
      exists: true,
      valid: true,
      path,
      message: "Codex auth file is present and parseable."
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        exists: false,
        valid: false,
        path,
        message: "auth.json is missing. Upload it in the Login page before continuing."
      };
    }

    return {
      exists: true,
      valid: false,
      path,
      message: "auth.json exists but could not be parsed as JSON."
    };
  }
}

export async function saveAuthFile(raw: string): Promise<AuthStatus> {
  JSON.parse(raw);

  const path = getAuthPath();
  await mkdir(join(homedir(), ".codex"), { recursive: true });
  await writeFile(path, raw, "utf8");

  return readAuthStatus();
}
