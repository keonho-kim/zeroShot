#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { homedir } from "node:os";

function expandHomePath(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "~") {
    return homedir();
  }
  if (trimmed.startsWith("~/") || trimmed.startsWith("~\\")) {
    return `${homedir()}${trimmed.slice(1)}`;
  }
  return trimmed;
}

function readRootArg(): string | null {
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current.startsWith("--root=")) {
      return current.slice("--root=".length);
    }
    if (current === "--root") {
      return args[index + 1] ?? null;
    }
  }
  return null;
}

const root = readRootArg();
const env = {
  ...process.env,
  ...(root ? { ZEROSHOT_BOOTSTRAP_ROOTS: expandHomePath(root) } : {})
};

const child = spawn("bun", ["./backend/dist/server.js"], {
  stdio: "inherit",
  env
});

child.on("close", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(`[serve] ${error.message}`);
  process.exit(1);
});
