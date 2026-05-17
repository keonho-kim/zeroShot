import { join } from "node:path";
import { getWorkspaceRoot } from "@backend/core/workspace.js";
import type { AppDefaults, BootstrapRequest, PipelineCommandSpec, PipelineOptions, RunMode } from "@backend/types.js";

export function buildPipelineCommandSpec(
  mode: RunMode,
  projectRoot: string,
  defaults: AppDefaults,
  options: PipelineOptions = {}
): PipelineCommandSpec {
  const workspaceRoot = getWorkspaceRoot();
  const cliEntry = process.env.ZEROSHOT_CLI_ENTRY;
  const args = [
    mode,
    "--project-root",
    projectRoot,
    "--approval",
    options.approval ?? defaults.approval,
    "--sandbox",
    options.sandbox ?? defaults.sandbox,
    "--max-iters",
    String(options.maxIters ?? defaults.maxIters),
    "--stall-limit",
    String(options.stallLimit ?? defaults.stallLimit),
    "--plan-reasoning",
    options.planReasoning ?? defaults.planReasoning,
    "--exec-reasoning",
    options.execReasoning ?? defaults.execReasoning,
    "--validate-reasoning",
    options.validateReasoning ?? defaults.validateReasoning,
    "--closeout-reasoning",
    options.closeoutReasoning ?? defaults.closeoutReasoning
  ];

  if (options.responseLanguage) {
    args.push("--response-language", options.responseLanguage);
  }

  for (const directory of options.additionalDirectories ?? []) {
    args.push("--add-dir", directory);
  }

  if (options.model) {
    args.push("--model", options.model);
  }

  return {
    command: "bun",
    args: cliEntry ? [cliEntry, ...args] : ["run", "--cwd", join(workspaceRoot, "cli"), "src/pipeline-cli.ts", ...args],
    cwd: cliEntry ? projectRoot : workspaceRoot,
    env: process.env
  };
}

export function buildBootstrapCommandSpec(request: BootstrapRequest): PipelineCommandSpec {
  const cliEntry = process.env.ZEROSHOT_APP_CLI_ENTRY;
  const args = [
    "bootstrap",
    "--project-root",
    request.projectRoot,
    "--type",
    request.projectType
  ];

  if (request.language) {
    args.push("--language", request.language);
  }
  if (request.serverLanguage) {
    args.push("--server-language", request.serverLanguage);
  }
  if (request.uiLanguage) {
    args.push("--ui-language", request.uiLanguage);
  }
  if (request.name) {
    args.push("--name", request.name);
  }
  if (request.module) {
    args.push("--module", request.module);
  }
  if (request.python) {
    args.push("--python", request.python);
  }
  if (request.profile) {
    args.push("--profile", request.profile);
  }
  if (request.skipInit) {
    args.push("--skip-init");
  }
  if (request.force) {
    args.push("--force");
  }

  return {
    command: cliEntry || "zeroshot",
    args,
    cwd: request.projectRoot,
    env: process.env
  };
}
