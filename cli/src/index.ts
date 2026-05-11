#!/usr/bin/env bun
import { parse } from "@iarna/toml";
import { Command } from "commander";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { findWorkspaceRoot } from "./pipeline/utils.js";
import { runPipeline } from "./pipeline/runner.js";
import type { AppDefaults, PipelineOptions, RunMode } from "./pipeline/types.js";

interface CliOptions extends PipelineOptions {
  projectRoot: string;
}

function getWorkspaceRoot(): string {
  return findWorkspaceRoot();
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
  return runPipeline(mode, options.projectRoot, defaults, options);
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

program.parseAsync(process.argv).catch((error: Error) => {
  console.error(`[zeroshot-cli] ${error.message}`);
  process.exit(1);
});
