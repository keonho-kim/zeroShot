import axios from "axios";
import type {
  AppConfig,
  ArchitectDecision,
  ArchitectDecisionResponse,
  ArchitectProgressEvent,
  AuthStatus,
  BootstrapResult,
  CodexSettings,
  DesignProgressEvent,
  DesignRecommendationResponse,
  DesignRuntimeMode,
  DesignRuntimeResponse,
  DirectoryEntry,
  JobSnapshot,
  PipelineOptions,
  ProductArtifactFile,
  ProjectCodexSettingsStatus,
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

export async function saveProductHtml(payload: { projectRoot: string; content: string }) {
  await client.put("/projects/product-html", payload);
}

export async function fetchProductArtifact(projectRoot: string) {
  return (await client.get<ProductArtifactFile>("/projects/product-artifact", { params: { projectRoot } })).data;
}

export async function saveProductArtifact(payload: { projectRoot: string; content: string; etag?: string }) {
  return (await client.put<ProductArtifactFile>("/projects/product-artifact", payload)).data;
}

export async function fetchDesignArtifact(projectRoot: string) {
  return (await client.get<ProductArtifactFile>("/projects/design-artifact", { params: { projectRoot } })).data;
}

export async function saveDesignArtifact(payload: { projectRoot: string; content: string; etag?: string }) {
  return (await client.put<ProductArtifactFile>("/projects/design-artifact", payload)).data;
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
  activeDesignSystemId?: string;
}) {
  return (await client.post<ArchitectDecisionResponse>("/architect/decisions", payload)).data;
}

export function parseStreamEvent(raw: string): { event: string; data: unknown } | null {
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
    activeDesignSystemId?: string;
  },
  onProgress: (event: ArchitectProgressEvent) => void,
  onMessage?: (message: string) => void
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
      if (parsed.event === "message") {
        const data = parsed.data as { message?: unknown };
        if (typeof data.message === "string") {
          onMessage?.(data.message);
        }
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

export async function runArchitectBootstrap(payload: {
  projectRoot: string;
  answers: Record<string, string>;
  decisions: ArchitectDecision[];
}) {
  return (await client.post<BootstrapResult>("/architect/bootstrap", payload)).data;
}

export async function createArchitectProductHtml(payload: {
  projectRoot: string;
  userBrief: string;
  decisionSet: ArchitectDecisionResponse;
  answers: Record<string, string>;
  locale: string;
  activeSkillId?: string;
  activeDesignTemplateId?: string;
  activeDesignSystemId?: string;
}) {
  return (await client.post<ProductArtifactFile>("/architect/product-html", payload)).data;
}

export async function requestDesignRuntimeStream(
  payload: {
    projectRoot: string;
    mode: DesignRuntimeMode;
    goal: string;
    locale: string;
    activeSkillId?: string;
    activeDesignTemplateId?: string;
    activeDesignSystemId?: string;
  },
  onProgress: (event: DesignProgressEvent) => void,
  onMessage?: (message: string) => void
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
      if (parsed.event === "message") {
        const data = parsed.data as { message?: unknown };
        if (typeof data.message === "string") {
          onMessage?.(data.message);
        }
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

export async function requestDesignRecommendationsStream(
  payload: {
    projectRoot: string;
    locale: string;
  },
  onProgress: (event: DesignProgressEvent) => void
) {
  const response = await fetch("/api/design/recommendations/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Design recommendation request failed.");
  }
  if (!response.body) {
    throw new Error("Design recommendation stream is unavailable.");
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
        return (parsed.data as { recommendations: DesignRecommendationResponse }).recommendations;
      }
      if (parsed.event === "error") {
        throw new Error((parsed.data as { message: string }).message);
      }
    }

    if (done) {
      break;
    }
  }

  throw new Error("Design recommendation stream ended before recommendations were returned.");
}

export async function startBuild(payload: { projectRoot: string; productContent?: string; options?: PipelineOptions }) {
  return (await client.post<JobSnapshot>("/build", payload)).data;
}

export async function startUpdate(payload: { projectRoot: string; updateContent: string }) {
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

export async function highlightCode(payload: { code: string; language: string }) {
  return (await client.post<{ html: string; language: string }>("/highlight", payload)).data;
}

export async function fetchAppSettings() {
  return (await client.get<AppConfig>("/settings/app")).data;
}

export async function saveAppSettings(payload: AppConfig) {
  await client.put("/settings/app", payload);
}

export async function fetchResources() {
  return (await client.get<{ skills: ResourceManifest[]; designTemplates: ResourceManifest[]; designSystems: ResourceManifest[] }>("/resources")).data;
}

export async function fetchCodexSettings() {
  return (await client.get<CodexSettings>("/settings/codex")).data;
}

export async function saveCodexSettings(payload: CodexSettings) {
  await client.put("/settings/codex", payload);
}

export async function fetchProjectCodexSettings(projectRoot: string) {
  return (await client.get<ProjectCodexSettingsStatus>("/settings/codex/project", { params: { projectRoot } })).data;
}

export async function saveProjectCodexSettings(projectRoot: string) {
  return (await client.post<ProjectCodexSettingsStatus>("/settings/codex/project", { projectRoot })).data;
}
