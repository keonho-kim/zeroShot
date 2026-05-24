import type { AppConfig, CodexSettings, ProjectCodexSettingsStatus } from "@/types/api";
import { client } from "@/lib/api/client";
import { apiRoutes } from "@/lib/api/const/routes";

export async function fetchAppSettings() {
  return (await client.get<AppConfig>(apiRoutes.appSettings)).data;
}

export async function saveAppSettings(payload: AppConfig) {
  await client.put(apiRoutes.appSettings, payload);
}

export async function fetchCodexSettings() {
  return (await client.get<CodexSettings>(apiRoutes.codexSettings)).data;
}

export async function saveCodexSettings(payload: CodexSettings) {
  await client.put(apiRoutes.codexSettings, payload);
}

export async function fetchProjectCodexSettings(projectRoot: string) {
  return (await client.get<ProjectCodexSettingsStatus>(apiRoutes.projectCodexSettings, { params: { projectRoot } })).data;
}

export async function saveProjectCodexSettings(projectRoot: string) {
  return (await client.post<ProjectCodexSettingsStatus>(apiRoutes.projectCodexSettings, { projectRoot })).data;
}
