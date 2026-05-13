import axios from "axios";
import type {
  AppConfig,
  ArchitectDecisionResponse,
  ArchitectProgressEvent,
  AuthStatus,
  CodexSettings,
  DesignProgressEvent,
  DesignRuntimeMode,
  DesignRuntimeResponse,
  DirectoryEntry,
  JobSnapshot,
  PipelineOptions,
  ProductArtifactFile,
  ProjectSettings,
  ProjectState,
  ResourceManifest,
  RunDetail,
  RunSummary
} from "@/types/api";

const client = axios.create({
  baseURL: "/api"
});

export async function fetchAuthStatus() {
  return (await client.get<AuthStatus>("/auth/status")).data;
}

export async function saveAuthStatus(content: string) {
  return (await client.put<AuthStatus>("/auth", { content })).data;
}

export async function fetchProjectTree(path?: string) {
  return (await client.get<{ path: string; entries: DirectoryEntry[] }>("/projects/tree", { params: { path } })).data;
}

export async function allowProjectRoot(path: string) {
  return (await client.post<AppConfig>("/projects/allow", { path })).data;
}

export async function createProjectDirectory(parentPath: string, name: string) {
  return (await client.post<DirectoryEntry>("/projects/directory", { parentPath, name })).data;
}

export async function deleteProjectDirectory(path: string) {
  await client.delete("/projects/directory", { data: { path } });
}

export async function fetchProjectState(projectRoot: string) {
  return (await client.get<ProjectState>("/projects/state", { params: { projectRoot } })).data;
}

export async function fetchProjectSettings(projectRoot: string) {
  return (await client.get<ProjectSettings>("/projects/settings", { params: { projectRoot } })).data;
}

export async function saveProjectSettings(payload: ProjectSettings) {
  return (await client.put<ProjectSettings>("/projects/settings", payload)).data;
}

export async function fetchProductHtml(projectRoot: string) {
  return (await client.get<string>("/projects/product-html", { params: { projectRoot }, responseType: "text" })).data;
}

export async function saveProductHtml(payload: { projectRoot: string; content: string; markdownMirror: string }) {
  await client.put("/projects/product-html", payload);
}

export async function fetchProductArtifact(projectRoot: string) {
  return (await client.get<ProductArtifactFile>("/projects/product-artifact", { params: { projectRoot } })).data;
}

export async function saveProductArtifact(payload: { projectRoot: string; content: string; markdownMirror: string; etag?: string }) {
  return (await client.put<ProductArtifactFile>("/projects/product-artifact", payload)).data;
}

export async function fetchLatestDesign(projectRoot: string) {
  return (await client.get<DesignRuntimeResponse | null>("/design/latest", { params: { projectRoot } })).data;
}

export async function requestArchitectDecisions(payload: {
  projectRoot: string;
  goal: string;
  locale: string;
  activeSkillId?: string;
  activeDesignTemplateId?: string;
}) {
  return (await client.post<ArchitectDecisionResponse>("/architect/decisions", payload)).data;
}

function parseStreamEvent(raw: string): { event: string; data: unknown } | null {
  const event = raw.split("\n").find((line) => line.startsWith("event: "))?.slice(7).trim();
  const data = raw
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice(6))
    .join("\n");

  if (!event || !data) {
    return null;
  }

  return { event, data: JSON.parse(data) as unknown };
}

export async function requestArchitectDecisionsStream(
  payload: {
    projectRoot: string;
    goal: string;
    locale: string;
    activeSkillId?: string;
    activeDesignTemplateId?: string;
  },
  onProgress: (event: ArchitectProgressEvent) => void
) {
  const response = await fetch("/api/architect/decisions/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Architect request failed.");
  }
  if (!response.body) {
    throw new Error("Architect stream is unavailable.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const parsed = parseStreamEvent(part);
      if (!parsed) {
        continue;
      }
      if (parsed.event === "progress") {
        onProgress(parsed.data as ArchitectProgressEvent);
      }
      if (parsed.event === "complete") {
        return (parsed.data as { decisions: ArchitectDecisionResponse }).decisions;
      }
      if (parsed.event === "error") {
        throw new Error((parsed.data as { message: string }).message);
      }
    }

    if (done) {
      break;
    }
  }

  throw new Error("Architect stream ended before decisions were returned.");
}

export async function requestDesignRuntimeStream(
  payload: {
    projectRoot: string;
    mode: DesignRuntimeMode;
    goal: string;
    locale: string;
    activeSkillId?: string;
    activeDesignTemplateId?: string;
  },
  onProgress: (event: DesignProgressEvent) => void
) {
  const response = await fetch("/api/design/runtime/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Design runtime request failed.");
  }
  if (!response.body) {
    throw new Error("Design runtime stream is unavailable.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const parsed = parseStreamEvent(part);
      if (!parsed) {
        continue;
      }
      if (parsed.event === "progress") {
        onProgress(parsed.data as DesignProgressEvent);
      }
      if (parsed.event === "complete") {
        return (parsed.data as { design: DesignRuntimeResponse }).design;
      }
      if (parsed.event === "error") {
        throw new Error((parsed.data as { message: string }).message);
      }
    }

    if (done) {
      break;
    }
  }

  throw new Error("Design runtime stream ended before a design response was returned.");
}

export async function startBuild(payload: { projectRoot: string; productContent?: string; options?: PipelineOptions }) {
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

export async function fetchAppSettings() {
  return (await client.get<AppConfig>("/settings/app")).data;
}

export async function saveAppSettings(payload: AppConfig) {
  await client.put("/settings/app", payload);
}

export async function fetchResources() {
  return (await client.get<{ skills: ResourceManifest[]; designTemplates: ResourceManifest[] }>("/resources")).data;
}

export async function fetchCodexSettings() {
  return (await client.get<CodexSettings>("/settings/codex")).data;
}

export async function saveCodexSettings(payload: CodexSettings) {
  await client.put("/settings/codex", payload);
}
