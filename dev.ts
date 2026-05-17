#!/usr/bin/env bun
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
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
const devResourceRoots = {
  skills: join(repoRoot, "system-asseets", "design", "source-files", "skills"),
  design_templates: join(repoRoot, "system-asseets", "design", "source-files", "design-templates"),
  design_systems: join(repoRoot, "system-asseets", "design", "source-files", "design-systems")
};

async function pathExists(path: string): Promise<boolean> {
  return readFile(path).then(() => true).catch(() => false);
}

async function directoryExists(path: string): Promise<boolean> {
  return stat(path).then((info) => info.isDirectory()).catch(() => false);
}

function readResourceRoot(raw: string, key: keyof typeof devResourceRoots): string {
  const section = /(?:^|\n)\[resource_roots\]\n(?<body>[\s\S]*?)(?=\n\[|$)/.exec(raw)?.groups?.body ?? "";
  const value = new RegExp(`^\\s*${key}\\s*=\\s*["'](?<value>[^"']*)["']`, "m").exec(section)?.groups?.value;
  return value ?? "";
}

function quoteTomlString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

function upsertResourceRoot(raw: string, key: keyof typeof devResourceRoots, value: string): string {
  const line = `${key} = ${quoteTomlString(value)}`;
  const keyPattern = new RegExp(`^\\s*${key}\\s*=.*$`, "m");
  if (keyPattern.test(raw)) {
    return raw.replace(keyPattern, line);
  }
  if (/(^|\n)\[resource_roots\]\n/.test(raw)) {
    return raw.replace(/(^|\n)\[resource_roots\]\n/, (match) => `${match}${line}\n`);
  }
  return `${raw.trimEnd()}\n\n[resource_roots]\n${line}\n`;
}

function shouldUseDevResourceRoot(current: string, key: keyof typeof devResourceRoots): boolean {
  if (!current) {
    return true;
  }
  if (key === "skills" && current.endsWith("/.agents/skills")) {
    return true;
  }
  return false;
}

async function ensureDevResourceRoots(configPath: string): Promise<void> {
  let raw = await readFile(configPath, "utf8");
  let next = raw;

  for (const key of Object.keys(devResourceRoots) as Array<keyof typeof devResourceRoots>) {
    const current = readResourceRoot(next, key);
    const expected = devResourceRoots[key];
    if (shouldUseDevResourceRoot(current, key) && await directoryExists(expected)) {
      next = upsertResourceRoot(next, key, expected);
    }
  }

  if (next !== raw) {
    await writeFile(configPath, next, "utf8");
  }
}

async function ensureDevConfig(): Promise<string> {
  if (process.env.ZEROSHOT_APP_CONFIG) {
    return process.env.ZEROSHOT_APP_CONFIG;
  }

  const configPath = join(repoRoot, "config.dev.toml");
  if (await pathExists(configPath)) {
    await ensureDevResourceRoots(configPath);
    return configPath;
  }

  const samplePath = join(repoRoot, "config.dev.toml.sample");
  if (!(await pathExists(samplePath))) {
    throw new Error("config.dev.toml.sample is required to create the local dev config.");
  }

  const sample = await readFile(samplePath, "utf8");
  await writeFile(configPath, sample.replaceAll("{{ZEROSHOT_REPO_ROOT}}", repoRoot), "utf8");
  await ensureDevResourceRoots(configPath);
  return configPath;
}

async function ensureLocalCliEntry(): Promise<string> {
  if (process.env.ZEROSHOT_APP_CLI_ENTRY) {
    return process.env.ZEROSHOT_APP_CLI_ENTRY;
  }

  const entryPath = join(tmpdir(), "zeroshot-dev-cli", "zeroshot");
  await mkdir(dirname(entryPath), { recursive: true });
  await rm(entryPath, { force: true });
  const result = spawnSync("go", ["build", "-o", entryPath, "."], {
    cwd: join(repoRoot, "src", "cli"),
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "failed to build local ZeroShot CLI");
  }
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
