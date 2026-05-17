#!/usr/bin/env bun
import { spawn, type ChildProcess } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

type ProcSpec = {
  name: string;
  color: string;
  command: string;
  args: string[];
};

const processes: ChildProcess[] = [];
let shuttingDown = false;
const repoRoot = import.meta.dir;

async function pathExists(path: string): Promise<boolean> {
  return readFile(path).then(() => true).catch(() => false);
}

async function ensureDevConfig(): Promise<string> {
  if (process.env.ZEROSHOT_APP_CONFIG) {
    return process.env.ZEROSHOT_APP_CONFIG;
  }

  const configPath = join(repoRoot, "config.dev.toml");
  if (await pathExists(configPath)) {
    return configPath;
  }

  const samplePath = join(repoRoot, "config.dev.toml.sample");
  if (!(await pathExists(samplePath))) {
    throw new Error("config.dev.toml.sample is required to create the local dev config.");
  }

  const sample = await readFile(samplePath, "utf8");
  await writeFile(configPath, sample.replaceAll("{{ZEROSHOT_REPO_ROOT}}", repoRoot), "utf8");
  return configPath;
}

async function ensureLocalCliEntry(): Promise<string> {
  if (process.env.ZEROSHOT_APP_CLI_ENTRY) {
    return process.env.ZEROSHOT_APP_CLI_ENTRY;
  }

  const entryPath = join(tmpdir(), "zeroshot-dev-cli", "zeroshot");
  await mkdir(dirname(entryPath), { recursive: true });
  await writeFile(entryPath, [
    "#!/bin/sh",
    `exec go run ${JSON.stringify(join(repoRoot, "src", "cli"))} "$@"`,
    ""
  ].join("\n"), "utf8");
  await chmod(entryPath, 0o755);
  return entryPath;
}

function prefixAndPipe(stream: NodeJS.ReadableStream | null, name: string, color: string) {
  if (!stream) {
    return;
  }

  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line) {
        continue;
      }
      process.stdout.write(`${color}[${name}]\x1b[0m ${line}\n`);
    }
  });
}

function stopAll(signal: NodeJS.Signals = "SIGTERM") {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

function start(spec: ProcSpec) {
  const child = spawn(spec.command, spec.args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env
  });

  processes.push(child);
  prefixAndPipe(child.stdout, spec.name, spec.color);
  prefixAndPipe(child.stderr, spec.name, spec.color);

  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      process.stderr.write(`${spec.color}[${spec.name}]\x1b[0m exited (code=${code ?? "null"}, signal=${signal ?? "none"})\n`);
      stopAll();
      process.exitCode = code ?? 1;
    }
  });

  child.on("error", (error) => {
    process.stderr.write(`${spec.color}[${spec.name}]\x1b[0m failed to start: ${error.message}\n`);
    stopAll();
    process.exitCode = 1;
  });
}

process.on("SIGINT", () => {
  stopAll("SIGINT");
});

process.on("SIGTERM", () => {
  stopAll("SIGTERM");
});

const devConfigPath = await ensureDevConfig();
const localCliEntry = await ensureLocalCliEntry();
process.env.ZEROSHOT_APP_CONFIG = devConfigPath;
process.env.ZEROSHOT_APP_CLI_ENTRY = localCliEntry;
process.stdout.write(`[dev] using config: ${devConfigPath}\n`);
process.stdout.write(`[dev] using local CLI: ${localCliEntry}\n`);

start({
  name: "backend",
  color: "\x1b[36m",
  command: "bun",
  args: ["run", "dev:server"]
});

start({
  name: "frontend",
  color: "\x1b[35m",
  command: "bun",
  args: ["run", "dev:web"]
});
