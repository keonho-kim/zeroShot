#!/usr/bin/env bun
import { parse } from "@iarna/toml";
import { Command } from "commander";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findWorkspaceRoot } from "./pipeline/utils.js";
import { runPipeline } from "./pipeline/runner.js";
import type { AppDefaults, PipelineOptions, RunMode } from "./pipeline/types.js";

interface CliOptions extends PipelineOptions {
  projectRoot: string;
}

interface StartOptions {
  host?: string;
  port?: number;
}

const defaultAppOptions: AppDefaults = {
  approval: "never",
  sandbox: "workspace-write",
  maxIters: 30,
  stallLimit: 2,
  planReasoning: "high",
  execReasoning: "medium",
  validateReasoning: "medium",
  closeoutReasoning: "medium"
};

const defaultServerOptions = {
  host: "127.0.0.1",
  port: 3000
};

function getWorkspaceRoot(): string {
  return findWorkspaceRoot();
}

function getUserConfigPath(): string {
  return process.env.ZEROSHOT_APP_CONFIG ?? join(homedir(), ".zeroshot", "config.toml");
}

async function ensureUserConfig(): Promise<string> {
  const configPath = getUserConfigPath();
  await mkdir(dirname(configPath), { recursive: true });

  const config = await readFile(configPath, "utf8").catch(async (error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      const content = [
        `host = "${defaultServerOptions.host}"`,
        `port = ${defaultServerOptions.port}`,
        "allowed_roots = []",
        `default_approval = "${defaultAppOptions.approval}"`,
        `default_sandbox = "${defaultAppOptions.sandbox}"`,
        `max_iters = ${defaultAppOptions.maxIters}`,
        `stall_limit = ${defaultAppOptions.stallLimit}`,
        `plan_reasoning = "${defaultAppOptions.planReasoning}"`,
        `exec_reasoning = "${defaultAppOptions.execReasoning}"`,
        `validate_reasoning = "${defaultAppOptions.validateReasoning}"`,
        `closeout_reasoning = "${defaultAppOptions.closeoutReasoning}"`,
        ""
      ].join("\n");
      await writeFile(configPath, content, "utf8");
      return content;
    }
    throw error;
  });

  return config;
}

async function loadConfig(): Promise<Record<string, unknown>> {
  const config = await ensureUserConfig();
  return parse(config) as Record<string, unknown>;
}

async function loadDefaults(): Promise<AppDefaults> {
  const raw = await loadConfig();

  return {
    approval: typeof raw.default_approval === "string" ? raw.default_approval : defaultAppOptions.approval,
    sandbox: typeof raw.default_sandbox === "string" ? raw.default_sandbox : defaultAppOptions.sandbox,
    maxIters: typeof raw.max_iters === "number" ? raw.max_iters : defaultAppOptions.maxIters,
    stallLimit: typeof raw.stall_limit === "number" ? raw.stall_limit : defaultAppOptions.stallLimit,
    planReasoning: typeof raw.plan_reasoning === "string" ? raw.plan_reasoning : defaultAppOptions.planReasoning,
    execReasoning: typeof raw.exec_reasoning === "string" ? raw.exec_reasoning : defaultAppOptions.execReasoning,
    validateReasoning: typeof raw.validate_reasoning === "string" ? raw.validate_reasoning : defaultAppOptions.validateReasoning,
    closeoutReasoning: typeof raw.closeout_reasoning === "string" ? raw.closeout_reasoning : defaultAppOptions.closeoutReasoning
  };
}

async function loadServerOptions(options: StartOptions): Promise<{ host: string; port: number }> {
  const raw = await loadConfig();
  return {
    host: options.host ?? (typeof raw.host === "string" && raw.host.trim() ? raw.host : defaultServerOptions.host),
    port: options.port ?? (typeof raw.port === "number" && Number.isFinite(raw.port) ? raw.port : defaultServerOptions.port)
  };
}

async function assertDirectory(path: string): Promise<void> {
  const info = await stat(path).catch(() => null);
  if (!info || !info.isDirectory()) {
    throw new Error(`Project root does not exist or is not a directory: ${path}`);
  }
}

async function runCommand(mode: RunMode, options: CliOptions): Promise<number> {
  await assertDirectory(options.projectRoot);
  const defaults = await loadDefaults();
  return runPipeline(mode, options.projectRoot, defaults, options);
}

function packageRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);
  return currentDir.endsWith(`${join("cli", "src")}`) ? getWorkspaceRoot() : resolve(currentDir, "..");
}

function startArtifacts(): { backendEntry: string; frontendDist: string; cliEntry: string } {
  const root = packageRoot();
  const packagedBackend = join(root, "app", "backend", "dist", "server.js");
  const packagedFrontend = join(root, "app", "frontend", "dist");
  const devBackend = join(root, "backend", "src", "server.ts");
  const devFrontend = join(root, "frontend", "dist");

  return {
    backendEntry: existsSync(packagedBackend) ? packagedBackend : devBackend,
    frontendDist: existsSync(packagedFrontend) ? packagedFrontend : devFrontend,
    cliEntry: fileURLToPath(import.meta.url)
  };
}

async function startServer(options: StartOptions): Promise<void> {
  const server = await loadServerOptions(options);
  const configPath = getUserConfigPath();
  const artifacts = startArtifacts();

  if (!existsSync(artifacts.backendEntry)) {
    throw new Error(`ZeroShot server artifact was not found: ${artifacts.backendEntry}`);
  }
  if (!existsSync(artifacts.frontendDist)) {
    throw new Error(`ZeroShot frontend artifact was not found: ${artifacts.frontendDist}`);
  }

  const localUrl = `http://127.0.0.1:${server.port}`;
  const bindUrl = `http://${server.host}:${server.port}`;

  console.log("[zeroshot] starting ZeroShot app");
  console.log(`[zeroshot] config : ${configPath}`);
  console.log(`[zeroshot] bind   : ${bindUrl}`);
  console.log(`[zeroshot] local  : ${localUrl}`);
  if (server.host === "0.0.0.0") {
    console.log(`[zeroshot] LAN/Tailscale access uses this port: ${server.port}`);
    console.log("[zeroshot] for Tailscale, open http://<tailscale-ip>:" + server.port);
  } else {
    console.log("[zeroshot] set host = \"0.0.0.0\" in config.toml, or pass --host 0.0.0.0, to accept LAN/Tailscale traffic.");
  }

  const child = spawn("bun", [artifacts.backendEntry], {
    stdio: "inherit",
    env: {
      ...process.env,
      HOST: server.host,
      PORT: String(server.port),
      ZEROSHOT_APP_CONFIG: configPath,
      ZEROSHOT_CLI_ENTRY: artifacts.cliEntry,
      ZEROSHOT_FRONTEND_DIST: artifacts.frontendDist
    }
  });

  child.on("close", (code) => {
    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(`[zeroshot] failed to start: ${error.message}`);
    process.exit(1);
  });
}

function bindSharedOptions(command: Command): Command {
  return command
    .requiredOption("--project-root <path>", "Absolute path to the target project root")
    .option("--model <model>", "Override Codex model")
    .option("--approval <policy>", "Approval policy override")
    .option("--sandbox <mode>", "Sandbox mode override")
    .option("--max-iters <count>", "Maximum implementation iterations", Number)
    .option("--stall-limit <count>", "Stall threshold before replanning", Number)
    .option("--plan-reasoning <level>", "Reasoning effort for planning phases")
    .option("--exec-reasoning <level>", "Reasoning effort for implementation phases")
    .option("--validate-reasoning <level>", "Reasoning effort for validation")
    .option("--closeout-reasoning <level>", "Reasoning effort for closeout")
    .option("--response-language <language>", "Language Codex should use for user-facing run documents and final answers");
}

const program = new Command();
program
  .name("zeroshot")
  .description("ZeroShot production CLI wrapper")
  .showHelpAfterError()
  .addHelpText("after", `\nWorkspace root: ${getWorkspaceRoot()}`);

bindSharedOptions(program.command("build").description("Run the build pipeline")).action(async (options: CliOptions) => {
  process.exitCode = await runCommand("build", options);
});

bindSharedOptions(program.command("update").description("Run the update pipeline")).action(async (options: CliOptions) => {
  process.exitCode = await runCommand("update", options);
});

program
  .command("start")
  .description("Start the ZeroShot web app from installed build artifacts")
  .option("--host <host>", "Host interface to bind. Use 0.0.0.0 for LAN/Tailscale access")
  .option("--port <port>", "Port to listen on", Number)
  .action(async (options: StartOptions) => {
    await startServer(options);
  });

program.parseAsync(process.argv).catch((error: Error) => {
  console.error(`[zeroshot-cli] ${error.message}`);
  process.exit(1);
});
