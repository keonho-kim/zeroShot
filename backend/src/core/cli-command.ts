import { join } from "node:path";
import { getWorkspaceRoot } from "./workspace.js";
import type { AppDefaults, PipelineOptions, RunMode, ShellCommandSpec } from "../types.js";

export function buildShellCommandSpec(
  mode: RunMode,
  projectRoot: string,
  defaults: AppDefaults,
  options: PipelineOptions = {}
): ShellCommandSpec {
  const workspaceRoot = getWorkspaceRoot();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    MODE: mode,
    PROJECT_ROOT: projectRoot,
    PRODUCT_FILE: join(projectRoot, "PRODUCT.md"),
    UPDATE_FILE: join(projectRoot, "UPDATE.md"),
    WORK_ROOT: join(projectRoot, ".work.history"),
    ACTIVE_RUN_FILE: join(projectRoot, ".work.history", ".active_run"),
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

  return {
    command: "bash",
    args: [join(workspaceRoot, "scripts", "build.sh")],
    cwd: workspaceRoot,
    env
  };
}
