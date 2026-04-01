import axios from "axios";

export interface AuthStatus {
  exists: boolean;
  valid: boolean;
  path: string;
  message: string;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
}

export interface ProjectState {
  projectRoot: string;
  hasProduct: boolean;
  hasUpdate: boolean;
  workHistoryExists: boolean;
  runsCount: number;
  latestRunName?: string;
  updateEnabled: boolean;
}

export interface RunSummary {
  name: string;
  path: string;
  createdAt?: string;
  mode?: string;
}

export interface RunDetail {
  summary: RunSummary;
  meta: Record<string, string>;
  manifest: string;
  documents: Record<string, string>;
}

export interface AppConfig {
  allowedRoots: string[];
  defaults: {
    approval: string;
    sandbox: string;
    maxIters: number;
    stallLimit: number;
    planReasoning: string;
    execReasoning: string;
    validateReasoning: string;
    closeoutReasoning: string;
  };
}

export interface CodexSettings {
  modelProviders: Array<{ id: string; name: string; baseUrl: string; envKey?: string }>;
  profiles: Array<{ id: string; modelProvider: string; model: string }>;
  defaults: {
    profile?: string;
    model?: string;
    modelProvider?: string;
    approvalPolicy?: string;
    sandboxMode?: string;
  };
}

export interface JobSnapshot {
  id: string;
  mode: "build" | "update";
  projectRoot: string;
  status: "idle" | "running" | "completed" | "failed";
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
}

export interface FileReadResult {
  kind: "file" | "directory";
  path: string;
  content?: string;
  entries?: DirectoryEntry[];
}

const client = axios.create({
  baseURL: "/api"
});

export async function fetchAuthStatus() {
  return (await client.get<AuthStatus>("/auth/status")).data;
}

export async function fetchProjectTree(path?: string) {
  return (await client.get<{ path: string; entries: DirectoryEntry[] }>("/projects/tree", { params: { path } })).data;
}

export async function fetchProjectState(projectRoot: string) {
  return (await client.get<ProjectState>("/projects/state", { params: { projectRoot } })).data;
}

export async function startBuild(payload: { projectRoot: string; productContent: string }) {
  return (await client.post<JobSnapshot>("/build", payload)).data;
}

export async function startUpdate(payload: { projectRoot: string; productContent: string; updateContent: string }) {
  return (await client.post<JobSnapshot>("/update", payload)).data;
}

export async function fetchCurrentJob() {
  return (await client.get<JobSnapshot | null>("/jobs/current")).data;
}

export async function fetchRuns(projectRoot: string) {
  return (await client.get<{ runs: RunSummary[] }>("/history", { params: { projectRoot } })).data.runs;
}

export async function fetchRunDetail(projectRoot: string, runName: string) {
  return (await client.get<RunDetail>(`/history/${runName}`, { params: { projectRoot } })).data;
}

export async function fetchFile(projectRoot: string, path = "") {
  return (await client.get<FileReadResult>("/files", { params: { projectRoot, path } })).data;
}

export async function saveFile(projectRoot: string, path: string, content: string) {
  await client.put("/files", { projectRoot, path, content });
}

export async function fetchAppSettings() {
  return (await client.get<AppConfig>("/settings/app")).data;
}

export async function saveAppSettings(payload: AppConfig) {
  await client.put("/settings/app", payload);
}

export async function fetchCodexSettings() {
  return (await client.get<CodexSettings>("/settings/codex")).data;
}

export async function saveCodexSettings(payload: CodexSettings) {
  await client.put("/settings/codex", payload);
}
