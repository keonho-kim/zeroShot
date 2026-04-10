#!/usr/bin/env bun
import { spawn, type ChildProcess } from "node:child_process";
import { homedir } from "node:os";

type ProcSpec = {
  name: string;
  color: string;
  command: string;
  args: string[];
};

const processes: ChildProcess[] = [];
let shuttingDown = false;

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

const root = readRootArg();
if (root) {
  process.env.ZEROSHOT_BOOTSTRAP_ROOTS = expandHomePath(root);
}

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
