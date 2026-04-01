import { parse, stringify } from "@iarna/toml";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import type { CodexSettings } from "../types.js";

export function getCodexConfigPath(): string {
  return join(homedir(), ".codex", "config.toml");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export async function loadCodexSettings(): Promise<{ settings: CodexSettings; raw: Record<string, unknown> }> {
  const rawText = await readFile(getCodexConfigPath(), "utf8");
  const raw = parse(rawText) as Record<string, unknown>;
  const providersRecord = asRecord(raw.model_providers);
  const profilesRecord = asRecord(raw.profiles);

  const settings: CodexSettings = {
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
      sandboxMode: typeof raw.sandbox_mode === "string" ? raw.sandbox_mode : undefined
    }
  };

  return { settings, raw };
}

export async function saveCodexSettings(next: CodexSettings): Promise<void> {
  const { raw } = await loadCodexSettings();

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

  await writeFile(getCodexConfigPath(), stringify(raw as never), "utf8");
}
