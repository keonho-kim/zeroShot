#!/usr/bin/env bun
import { parse } from "@iarna/toml";
import { Command } from "commander";
import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type RunMode = "build" | "update";

interface PipelineOptions {
  model?: string;
  approval?: string;
  sandbox?: string;
  maxIters?: number;
  stallLimit?: number;
  planReasoning?: string;
  execReasoning?: string;
  validateReasoning?: string;
  closeoutReasoning?: string;
}

interface CliOptions extends PipelineOptions {
  projectRoot: string;
}

interface AppDefaults {
  approval: string;
  sandbox: string;
  maxIters: number;
  stallLimit: number;
  planReasoning: string;
  execReasoning: string;
  validateReasoning: string;
  closeoutReasoning: string;
}

function getWorkspaceRoot(): string {
  const current = dirname(fileURLToPath(import.meta.url));
  return resolve(current, "../../..");
}

async function loadDefaults(): Promise<AppDefaults> {
  const configPath = process.env.ZEROSHOT_APP_CONFIG ?? join(getWorkspaceRoot(), "zeroshot.app.toml");
  const raw = parse(await readFile(configPath, "utf8")) as Record<string, unknown>;

  return {
    approval: typeof raw.default_approval === "string" ? raw.default_approval : "never",
    sandbox: typeof raw.default_sandbox === "string" ? raw.default_sandbox : "workspace-write",
    maxIters: typeof raw.max_iters === "number" ? raw.max_iters : 30,
    stallLimit: typeof raw.stall_limit === "number" ? raw.stall_limit : 2,
    planReasoning: typeof raw.plan_reasoning === "string" ? raw.plan_reasoning : "high",
    execReasoning: typeof raw.exec_reasoning === "string" ? raw.exec_reasoning : "medium",
    validateReasoning: typeof raw.validate_reasoning === "string" ? raw.validate_reasoning : "medium",
    closeoutReasoning: typeof raw.closeout_reasoning === "string" ? raw.closeout_reasoning : "medium"
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
  const workspaceRoot = getWorkspaceRoot();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    MODE: mode,
    PROJECT_ROOT: options.projectRoot,
    PRODUCT_FILE: join(options.projectRoot, "PRODUCT.md"),
    UPDATE_FILE: join(options.projectRoot, "UPDATE.md"),
    WORK_ROOT: join(options.projectRoot, ".work.history"),
    ACTIVE_RUN_FILE: join(options.projectRoot, ".work.history", ".active_run"),
    APPROVAL: options.approval ?? defaults.approval,
    SANDBOX: options.sandbox ?? defaults.sandbox,
    MAX_ITERS: String(options.maxIters ?? defaults.maxIters),
    STALL_LIMIT: String(options.stallLimit ?? defaults.stallLimit),
    PLAN_REASONING: options.planReasoning ?? defaults.planReasoning,
    EXEC_REASONING: options.execReasoning ?? defaults.execReasoning,
    VALIDATE_REASONING: options.validateReasoning ?? defaults.validateReasoning,
    CLOSEOUT_REASONING: options.closeoutReasoning ?? defaults.closeoutReasoning
  };

  if (options.model) {
    env.MODEL = options.model;
  }

  return await new Promise<number>((resolvePromise, reject) => {
    const child = spawn("bash", [join(workspaceRoot, "scripts", "build.sh")], {
      cwd: workspaceRoot,
      env,
      stdio: "inherit"
    });

    child.on("close", (code) => resolvePromise(code ?? 1));
    child.on("error", reject);
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
    .option("--closeout-reasoning <level>", "Reasoning effort for closeout");
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

program.parseAsync(process.argv).catch((error: Error) => {
  console.error(`[zeroshot-cli] ${error.message}`);
  process.exit(1);
});
