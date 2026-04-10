import { parse, stringify } from "@iarna/toml";
import { readFile, writeFile } from "node:fs/promises";
import { expandHomePath } from "../core/path-input.js";
import { getAppConfigPath } from "../core/workspace.js";
import type { AppConfig } from "../types.js";

const defaultConfig: AppConfig = {
  bootstrapRoots: ["/project"],
  allowedRoots: [],
  defaults: {
    approval: "never",
    sandbox: "workspace-write",
    maxIters: 30,
    stallLimit: 2,
    planReasoning: "high",
    execReasoning: "medium",
    validateReasoning: "medium",
    closeoutReasoning: "medium"
  }
};

function normalizeRoots(value: unknown, fallback: string[]): string[] {
  const roots = Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : fallback;

  return Array.from(new Set(roots.map(expandHomePath)));
}

function getBootstrapRootsOverride(): string[] | null {
  const raw = process.env.ZEROSHOT_BOOTSTRAP_ROOTS;
  if (!raw?.trim()) {
    return null;
  }

  return Array.from(
    new Set(
      raw
        .split(",")
        .map(expandHomePath)
        .filter(Boolean)
    )
  );
}

function toString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function loadAppConfig(): Promise<AppConfig> {
  const filePath = getAppConfigPath();
  const raw = await readFile(filePath, "utf8");
  const parsed = parse(raw) as Record<string, unknown>;
  const bootstrapOverride = getBootstrapRootsOverride();

  return {
    bootstrapRoots: bootstrapOverride ?? normalizeRoots(parsed.bootstrap_roots, defaultConfig.bootstrapRoots),
    allowedRoots: normalizeRoots(parsed.allowed_roots, defaultConfig.allowedRoots),
    defaults: {
      approval: toString(parsed.default_approval, defaultConfig.defaults.approval),
      sandbox: toString(parsed.default_sandbox, defaultConfig.defaults.sandbox),
      maxIters: toNumber(parsed.max_iters, defaultConfig.defaults.maxIters),
      stallLimit: toNumber(parsed.stall_limit, defaultConfig.defaults.stallLimit),
      planReasoning: toString(parsed.plan_reasoning, defaultConfig.defaults.planReasoning),
      execReasoning: toString(parsed.exec_reasoning, defaultConfig.defaults.execReasoning),
      validateReasoning: toString(parsed.validate_reasoning, defaultConfig.defaults.validateReasoning),
      closeoutReasoning: toString(parsed.closeout_reasoning, defaultConfig.defaults.closeoutReasoning)
    }
  };
}

export async function saveAppConfig(config: AppConfig): Promise<void> {
  const payload = {
    bootstrap_roots: normalizeRoots(config.bootstrapRoots, defaultConfig.bootstrapRoots),
    allowed_roots: normalizeRoots(config.allowedRoots, defaultConfig.allowedRoots),
    default_approval: config.defaults.approval,
    default_sandbox: config.defaults.sandbox,
    max_iters: config.defaults.maxIters,
    stall_limit: config.defaults.stallLimit,
    plan_reasoning: config.defaults.planReasoning,
    exec_reasoning: config.defaults.execReasoning,
    validate_reasoning: config.defaults.validateReasoning,
    closeout_reasoning: config.defaults.closeoutReasoning
  };

  await writeFile(getAppConfigPath(), stringify(payload), "utf8");
}
