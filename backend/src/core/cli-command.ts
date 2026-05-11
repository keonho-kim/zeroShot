import { join } from "node:path";
import { getWorkspaceRoot } from "./workspace.js";
import type { AppDefaults, PipelineCommandSpec, PipelineOptions, RunMode } from "../types.js";

export function buildPipelineCommandSpec(
  mode: RunMode,
  projectRoot: string,
  defaults: AppDefaults,
  options: PipelineOptions = {}
): PipelineCommandSpec {
  const workspaceRoot = getWorkspaceRoot();
  const args = [
    "run",
    "--cwd",
    join(workspaceRoot, "cli"),
    "src/index.ts",
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

  if (options.model) {
    args.push("--model", options.model);
  }

  return {
    command: "bun",
    args,
    cwd: workspaceRoot,
    env: process.env
  };
}
