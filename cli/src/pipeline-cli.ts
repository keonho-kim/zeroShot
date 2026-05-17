#!/usr/bin/env bun
import { parse } from "@iarna/toml";
import { Command } from "commander";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { runPipeline } from "@cli/pipeline/runner.js";
import type { AppDefaults, PipelineOptions, RunMode } from "@cli/pipeline/types.js";

interface CliOptions extends PipelineOptions {
  projectRoot: string;
  addDir?: string[];
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

function getUserConfigPath(): string {
  return process.env.ZEROSHOT_APP_CONFIG ?? join(homedir(), ".zeroshot", "config.toml");
}

async function ensureUserConfig(): Promise<string> {
  const configPath = getUserConfigPath();
  await mkdir(dirname(configPath), { recursive: true });

  const config = await readFile(configPath, "utf8").catch(async (error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      const content = [
        'host = "127.0.0.1"',
        "port = 32575",
        "allowed_roots = []",
        `default_approval = "${defaultAppOptions.approval}"`,
        `default_sandbox = "${defaultAppOptions.sandbox}"`,
        `max_iters = ${defaultAppOptions.maxIters}`,
        `stall_limit = ${defaultAppOptions.stallLimit}`,
        `plan_reasoning = "${defaultAppOptions.planReasoning}"`,
        `exec_reasoning = "${defaultAppOptions.execReasoning}"`,
        `validate_reasoning = "${defaultAppOptions.validateReasoning}"`,
        `closeout_reasoning = "${defaultAppOptions.closeoutReasoning}"`,
        "",
        "[resource_roots]",
        'skills = "~/.zeroshot/skills"',
        'design_templates = "~/.zeroshot/design-templates"',
        'design_systems = "~/.zeroshot/design-systems"',
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

async function assertDirectory(path: string): Promise<void> {
  const info = await stat(path).catch(() => null);
  if (!info || !info.isDirectory()) {
    throw new Error(`Project root does not exist or is not a directory: ${path}`);
  }
}

async function runCommand(mode: RunMode, options: CliOptions): Promise<number> {
  await assertDirectory(options.projectRoot);
  const defaults = await loadDefaults();
  return runPipeline(mode, options.projectRoot, defaults, {
    ...options,
    additionalDirectories: options.addDir ?? options.additionalDirectories
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
    .option("--add-dir <path>", "Additional directory Codex can read during pipeline runs", (value, previous: string[] = []) => [...previous, value], [])
    .option("--response-language <language>", "Language Codex should use for user-facing run documents and final answers");
}

const program = new Command();
program
  .name("zeroshot-pipeline")
  .description("ZeroShot Codex SDK pipeline runner")
  .showHelpAfterError();

bindSharedOptions(program.command("build").description("Run the build pipeline")).action(async (options: CliOptions) => {
  process.exitCode = await runCommand("build", options);
});

bindSharedOptions(program.command("update").description("Run the update pipeline")).action(async (options: CliOptions) => {
  process.exitCode = await runCommand("update", options);
});

program.parseAsync(process.argv).catch((error: Error) => {
  console.error(`[zeroshot-pipeline] ${error.message}`);
  process.exit(1);
});
