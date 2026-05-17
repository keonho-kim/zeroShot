import { access, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import type { AppDefaults, PipelineContext, PipelineOptions, RunMode } from "@cli/pipeline/types.js";
import { createEmptyPipelineState } from "@cli/pipeline/storage.js";

export function nowHuman(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function todayRunPrefix(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${String(date.getFullYear()).slice(-2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

export function slug(input: string): string {
  return input.replace(/[\s/:]/g, "_").replace(/[^A-Za-z0-9_.-]/g, "");
}

export function findWorkspaceRoot(): string {
  let current = dirname(fileURLToPath(import.meta.url));
  while (true) {
    if (existsSync(join(current, "zeroshot.app.toml")) && existsSync(join(current, "package.json"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    }
    current = parent;
  }
}

export async function assertDirectory(path: string): Promise<void> {
  const info = await stat(path).catch(() => null);
  if (!info || !info.isDirectory()) {
    throw new Error(`Project root does not exist or is not a directory: ${path}`);
  }
}

export async function commandExists(command: string): Promise<boolean> {
  return await new Promise((resolvePromise) => {
    const child = spawn("sh", ["-c", `command -v ${command}`], { stdio: "ignore" });
    child.on("close", (code) => resolvePromise(code === 0));
    child.on("error", () => resolvePromise(false));
  });
}

export async function fileExists(path: string): Promise<boolean> {
  return access(path, constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

export function mergeOptions(defaults: AppDefaults, options: PipelineOptions): PipelineContext["options"] {
  return {
    approval: options.approval ?? defaults.approval,
    sandbox: options.sandbox ?? defaults.sandbox,
    maxIters: options.maxIters ?? defaults.maxIters,
    stallLimit: options.stallLimit ?? defaults.stallLimit,
    planReasoning: options.planReasoning ?? defaults.planReasoning,
    execReasoning: options.execReasoning ?? defaults.execReasoning,
    validateReasoning: options.validateReasoning ?? defaults.validateReasoning,
    closeoutReasoning: options.closeoutReasoning ?? defaults.closeoutReasoning,
    responseLanguage: options.responseLanguage ?? process.env.ZEROSHOT_RESPONSE_LANGUAGE ?? "en",
    additionalDirectories: options.additionalDirectories ?? [],
    ...(options.model ? { model: options.model } : {})
  };
}

export function createInitialContext(mode: RunMode, projectRoot: string, defaults: AppDefaults, options: PipelineOptions): PipelineContext {
  const root = resolve(projectRoot);
  const toolRoot = findWorkspaceRoot();
  const createdAt = nowHuman();
  return {
    mode,
    projectRoot: root,
    toolRoot,
    productFile: join(root, "ARCHITECT", "PRODUCT.html"),
    updateFile: join(root, "UPDATE.md"),
    workRoot: join(root, "runs"),
    activeRunFile: join(root, "runs", ".active_run"),
    runDir: "",
    runName: "",
    runLogDir: "",
    runInputDir: "",
    outputsDir: "",
    previousRunDir: "",
    phaseSeq: 0,
    pipelineNote: "",
    createdAt,
    compactState: createEmptyPipelineState(),
    options: mergeOptions(defaults, options)
  };
}

export async function findLatestRunDir(workRoot: string): Promise<string> {
  const entries = await readdir(workRoot).catch(() => []);
  const runs = entries.filter((entry) => /^\d{6}-\d{3}$/.test(entry)).sort();
  const latest = runs.at(-1);
  return latest ? join(workRoot, latest) : "";
}

export async function nextRunDir(workRoot: string): Promise<string> {
  const today = todayRunPrefix();
  const entries = await readdir(workRoot).catch(() => []);
  const max = entries
    .map((entry) => new RegExp(`^${today}-(\\d{3})$`).exec(entry)?.[1])
    .filter((entry): entry is string => Boolean(entry))
    .reduce((currentMax, entry) => Math.max(currentMax, Number.parseInt(entry, 10)), 0);
  return join(workRoot, `${today}-${String(max + 1).padStart(3, "0")}`);
}

export async function setupRunPaths(ctx: PipelineContext, runDir: string): Promise<void> {
  ctx.runDir = runDir;
  ctx.runName = runDir.split(/[\\/]/).at(-1) ?? "";
  ctx.runLogDir = runDir;
  ctx.runInputDir = runDir;
  ctx.outputsDir = runDir;
  await mkdir(ctx.runDir, { recursive: true });
}

export async function initializeRunStructure(ctx: PipelineContext): Promise<void> {
  if (process.env.ZEROSHOT_DEBUG_HISTORY_FILES === "1") {
    await writeFile(
      join(ctx.runDir, "manifest.tsv"),
      "seq\tphase\tgate\tprocess_exit\tselected_task\tprogress_made\tqueue_empty\tcode_changed\tproduct_sync_safe\n",
      "utf8"
    );
  }
}

export async function writeRunMeta(ctx: PipelineContext): Promise<void> {
  const lines = [
    `run_name=${ctx.runName}`,
    `run_dir=${ctx.runDir}`,
    `repo_root=${ctx.projectRoot}`,
    `product_file=${ctx.productFile}`,
    `update_file=${ctx.updateFile}`,
    `created_at=${ctx.createdAt}`,
    `run_mode=${ctx.mode}`,
    `previous_run_dir=${ctx.previousRunDir}`,
    `approval=${ctx.options.approval}`,
    `sandbox=${ctx.options.sandbox}`,
    `max_iters=${ctx.options.maxIters}`,
    `stall_limit=${ctx.options.stallLimit}`,
    `plan_reasoning=${ctx.options.planReasoning}`,
    `exec_reasoning=${ctx.options.execReasoning}`,
    `validate_reasoning=${ctx.options.validateReasoning}`,
    `closeout_reasoning=${ctx.options.closeoutReasoning}`,
    ""
  ];
  if (process.env.ZEROSHOT_DEBUG_HISTORY_FILES === "1") {
    await writeFile(join(ctx.runDir, "run.meta"), lines.join("\n"), "utf8");
  }
}

export async function archiveUpdateInput(ctx: PipelineContext): Promise<void> {
  if (ctx.mode !== "update") {
    console.log("[run] build 모드이므로 UPDATE.md 이동은 수행하지 않습니다.");
    return;
  }
  if (!(await fileExists(ctx.updateFile))) {
    console.log(`[run] UPDATE.md가 이미 이동되었거나 존재하지 않습니다: ${ctx.updateFile}`);
    return;
  }
  console.log("[run] UPDATE.md는 workspace root에 유지합니다. runs/에는 사용자용 HTML 산출물만 기록합니다.");
}
