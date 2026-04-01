import { homedir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import type { AuthStatus } from "../types.js";

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
        message: "auth.json is missing. Upload or create it outside the app before continuing."
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
