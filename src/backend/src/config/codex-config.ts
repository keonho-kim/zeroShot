import { parse, stringify } from "@iarna/toml";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { CodexSettings, ProjectCodexSettingsStatus } from "@backend/types/codex-settings";

const defaultProjectCodexSettings = {
  model: "gpt-5.5",
  modelReasoningEffort: "high",
  approvalPolicy: "never",
  sandboxMode: "danger-full-access",
  goalsEnabled: true
};

export function getCodexConfigPath(): string {
  return join(homedir(), ".codex", "config.toml");
}

export function getProjectCodexConfigPath(projectRoot: string): string {
  return join(projectRoot, ".codex", "config.toml");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

async function readTomlFile(path: string): Promise<Record<string, unknown>> {
  const rawText = await readFile(path, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return "";
    }
    throw error;
  });
  return rawText ? (parse(rawText) as Record<string, unknown>) : {};
}

async function writeTomlFile(path: string, raw: Record<string, unknown>): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stringify(raw as never), "utf8");
}

function toCodexSettings(raw: Record<string, unknown>): CodexSettings {
  const providersRecord = asRecord(raw.model_providers);
  const profilesRecord = asRecord(raw.profiles);
  const features = asRecord(raw.features);

  return {
    modelProviders: Object.entries(providersRecord).map(([id, value]) => {
      const item = asRecord(value);
      return {
        id,
        name: typeof item.name === "string" ? item.name : id,
        baseUrl: typeof item.base_url === "string" ? item.base_url : "",
        envKey: typeof item.env_key === "string" ? item.env_key : undefined
      };
    }),
    profiles: Object.entries(profilesRecord).map(([id, value]) => {
      const item = asRecord(value);
      return {
        id,
        modelProvider: typeof item.model_provider === "string" ? item.model_provider : "",
        model: typeof item.model === "string" ? item.model : ""
      };
    }),
    defaults: {
      profile: typeof raw.profile === "string" ? raw.profile : undefined,
      model: typeof raw.model === "string" ? raw.model : undefined,
      modelProvider: typeof raw.model_provider === "string" ? raw.model_provider : undefined,
      approvalPolicy: typeof raw.approval_policy === "string" ? raw.approval_policy : undefined,
      sandboxMode: typeof raw.sandbox_mode === "string" ? raw.sandbox_mode : undefined,
      modelReasoningEffort: typeof raw.model_reasoning_effort === "string" ? raw.model_reasoning_effort : undefined,
      approvalsReviewer: typeof raw.approvals_reviewer === "string" ? raw.approvals_reviewer : undefined,
      goalsEnabled: typeof features.goals === "boolean" ? features.goals : undefined
    }
  };
}

function applyCodexSettings(raw: Record<string, unknown>, next: CodexSettings): Record<string, unknown> {
  raw.model_providers = Object.fromEntries(
    next.modelProviders.map((provider) => [
      provider.id,
      {
        name: provider.name,
        base_url: provider.baseUrl,
        ...(provider.envKey ? { env_key: provider.envKey } : {})
      }
    ])
  );

  raw.profiles = Object.fromEntries(
    next.profiles.map((profile) => [
      profile.id,
      {
        model_provider: profile.modelProvider,
        model: profile.model
      }
    ])
  );

  if (next.defaults.profile) {
    raw.profile = next.defaults.profile;
  }
  if (next.defaults.model) {
    raw.model = next.defaults.model;
  }
  if (next.defaults.modelProvider) {
    raw.model_provider = next.defaults.modelProvider;
  }
  if (next.defaults.approvalPolicy) {
    raw.approval_policy = next.defaults.approvalPolicy;
  }
  if (next.defaults.sandboxMode) {
    raw.sandbox_mode = next.defaults.sandboxMode;
  }
  if (next.defaults.modelReasoningEffort) {
    raw.model_reasoning_effort = next.defaults.modelReasoningEffort;
  }
  if (next.defaults.approvalsReviewer) {
    raw.approvals_reviewer = next.defaults.approvalsReviewer;
  }
  if (typeof next.defaults.goalsEnabled === "boolean") {
    raw.features = {
      ...asRecord(raw.features),
      goals: next.defaults.goalsEnabled
    };
  }

  return raw;
}

function isProjectTrusted(raw: Record<string, unknown>, projectRoot: string): boolean {
  const projects = asRecord(raw.projects);
  return asRecord(projects[projectRoot]).trust_level === "trusted";
}

function projectStatus(projectRoot: string, raw: Record<string, unknown>, userRaw: Record<string, unknown>, exists: boolean): ProjectCodexSettingsStatus {
  const features = asRecord(raw.features);
  return {
    projectRoot,
    configPath: getProjectCodexConfigPath(projectRoot),
    exists,
    trusted: isProjectTrusted(userRaw, projectRoot),
    model: typeof raw.model === "string" ? raw.model : undefined,
    modelReasoningEffort: typeof raw.model_reasoning_effort === "string" ? raw.model_reasoning_effort : undefined,
    approvalPolicy: typeof raw.approval_policy === "string" ? raw.approval_policy : undefined,
    sandboxMode: typeof raw.sandbox_mode === "string" ? raw.sandbox_mode : undefined,
    goalsEnabled: features.goals === true
  };
}

export async function loadCodexSettings(): Promise<{ settings: CodexSettings; raw: Record<string, unknown> }> {
  const raw = await readTomlFile(getCodexConfigPath());
  return { settings: toCodexSettings(raw), raw };
}

export async function saveCodexSettings(next: CodexSettings): Promise<void> {
  const { raw } = await loadCodexSettings();
  await writeTomlFile(getCodexConfigPath(), applyCodexSettings(raw, next));
}

export async function readProjectCodexSettings(projectRoot: string, userConfigPath = getCodexConfigPath()): Promise<ProjectCodexSettingsStatus> {
  const configPath = getProjectCodexConfigPath(projectRoot);
  const exists = await readFile(configPath, "utf8")
    .then(() => true)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return false;
      }
      throw error;
  });
  const raw = await readTomlFile(configPath);
  const userRaw = await readTomlFile(userConfigPath);
  return projectStatus(projectRoot, raw, userRaw, exists);
}

export async function saveProjectCodexSettings(projectRoot: string, userConfigPath = getCodexConfigPath()): Promise<ProjectCodexSettingsStatus> {
  const projectConfigPath = getProjectCodexConfigPath(projectRoot);
  const projectRaw = await readTomlFile(projectConfigPath);
  projectRaw.model = defaultProjectCodexSettings.model;
  projectRaw.model_reasoning_effort = defaultProjectCodexSettings.modelReasoningEffort;
  projectRaw.approval_policy = defaultProjectCodexSettings.approvalPolicy;
  projectRaw.sandbox_mode = defaultProjectCodexSettings.sandboxMode;
  projectRaw.features = {
    ...asRecord(projectRaw.features),
    goals: defaultProjectCodexSettings.goalsEnabled
  };

  await writeTomlFile(projectConfigPath, projectRaw);

  const userRaw = await readTomlFile(userConfigPath);
  userRaw.projects = {
    ...asRecord(userRaw.projects),
    [projectRoot]: {
      ...asRecord(asRecord(userRaw.projects)[projectRoot]),
      trust_level: "trusted"
    }
  };
  await writeTomlFile(userConfigPath, userRaw);

  return projectStatus(projectRoot, projectRaw, userRaw, true);
}
