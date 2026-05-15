import { parse, stringify } from "@iarna/toml";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { expandHomePath } from "@backend/core/path-input.js";
import { getAppConfigPath } from "@backend/core/workspace.js";
import type { AppConfig } from "@backend/types.js";

const defaultConfig: AppConfig = {
  bootstrapRoots: [homedir()],
  allowedRoots: [],
  resourceRoots: {
    skills: join(homedir(), ".zeroshot", "skills"),
    designTemplates: join(homedir(), ".zeroshot", "design-templates")
  },
  server: {
    host: "127.0.0.1",
    port: 32575
  },
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

function toString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readResourceRoots(parsed: Record<string, unknown>): AppConfig["resourceRoots"] {
  const resourceRoots = typeof parsed.resource_roots === "object" && parsed.resource_roots !== null
    ? parsed.resource_roots as Record<string, unknown>
    : {};

  return {
    skills: expandHomePath(toString(resourceRoots.skills, defaultConfig.resourceRoots.skills)),
    designTemplates: expandHomePath(toString(resourceRoots.design_templates, defaultConfig.resourceRoots.designTemplates))
  };
}

async function ensureConfigFile(): Promise<string> {
  const filePath = getAppConfigPath();
  await mkdir(dirname(filePath), { recursive: true });

  const existing = await readFile(filePath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return "";
    }
    throw error;
  });

  if (existing) {
    return existing;
  }

    const payload = stringify({
      host: defaultConfig.server.host,
      port: defaultConfig.server.port,
      allowed_roots: defaultConfig.allowedRoots,
      resource_roots: {
        skills: defaultConfig.resourceRoots.skills,
        design_templates: defaultConfig.resourceRoots.designTemplates
      },
      default_approval: defaultConfig.defaults.approval,
    default_sandbox: defaultConfig.defaults.sandbox,
    max_iters: defaultConfig.defaults.maxIters,
    stall_limit: defaultConfig.defaults.stallLimit,
    plan_reasoning: defaultConfig.defaults.planReasoning,
    exec_reasoning: defaultConfig.defaults.execReasoning,
    validate_reasoning: defaultConfig.defaults.validateReasoning,
    closeout_reasoning: defaultConfig.defaults.closeoutReasoning
  });
  await writeFile(filePath, payload, "utf8");
  return payload;
}

export async function loadAppConfig(): Promise<AppConfig> {
  const raw = await ensureConfigFile();
  const parsed = parse(raw) as Record<string, unknown>;

  return {
    bootstrapRoots: defaultConfig.bootstrapRoots,
    allowedRoots: normalizeRoots(parsed.allowed_roots, defaultConfig.allowedRoots),
    resourceRoots: readResourceRoots(parsed),
    server: {
      host: toString(parsed.host, defaultConfig.server.host),
      port: toNumber(parsed.port, defaultConfig.server.port)
    },
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
    host: toString(config.server?.host, defaultConfig.server.host),
    port: toNumber(config.server?.port, defaultConfig.server.port),
    allowed_roots: normalizeRoots(config.allowedRoots, defaultConfig.allowedRoots),
    resource_roots: {
      skills: expandHomePath(toString(config.resourceRoots?.skills, defaultConfig.resourceRoots.skills)),
      design_templates: expandHomePath(toString(config.resourceRoots?.designTemplates, defaultConfig.resourceRoots.designTemplates))
    },
    default_approval: config.defaults.approval,
    default_sandbox: config.defaults.sandbox,
    max_iters: config.defaults.maxIters,
    stall_limit: config.defaults.stallLimit,
    plan_reasoning: config.defaults.planReasoning,
    exec_reasoning: config.defaults.execReasoning,
    validate_reasoning: config.defaults.validateReasoning,
    closeout_reasoning: config.defaults.closeoutReasoning
  };

  const filePath = getAppConfigPath();
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, stringify(payload), "utf8");
}
