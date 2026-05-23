import type { AppConfig, DirectoryEntry, ProductArtifactFile, ProjectSettings, ProjectState } from "@/types/api";
import { client } from "@/lib/api/client";
import { apiRoutes } from "@/lib/api/const/routes";

export async function fetchProjectTree(path?: string) {
  return (await client.get<{ path: string; entries: DirectoryEntry[] }>(apiRoutes.projectTree, { params: { path } })).data;
}

export async function allowProjectRoot(path: string) {
  return (await client.post<AppConfig>(apiRoutes.projectAllow, { path })).data;
}

export async function createProjectDirectory(parentPath: string, name: string) {
  return (await client.post<DirectoryEntry>(apiRoutes.projectDirectory, { parentPath, name })).data;
}

export async function deleteProjectDirectory(path: string) {
  await client.delete(apiRoutes.projectDirectory, { data: { path } });
}

export async function fetchProjectState(projectRoot: string) {
  return (await client.get<ProjectState>(apiRoutes.projectState, { params: { projectRoot } })).data;
}

export async function fetchProjectSettings(projectRoot: string) {
  return (await client.get<ProjectSettings>(apiRoutes.projectSettings, { params: { projectRoot } })).data;
}

export async function saveProjectSettings(payload: ProjectSettings) {
  return (await client.put<ProjectSettings>(apiRoutes.projectSettings, payload)).data;
}

export async function fetchProductHtml(projectRoot: string) {
  return (await client.get<string>(apiRoutes.productHtml, { params: { projectRoot }, responseType: "text" })).data;
}

export async function saveProductHtml(payload: { projectRoot: string; content: string }) {
  await client.put(apiRoutes.productHtml, payload);
}

export async function fetchProductArtifact(projectRoot: string) {
  return (await client.get<ProductArtifactFile>(apiRoutes.productArtifact, { params: { projectRoot } })).data;
}

export async function saveProductArtifact(payload: { projectRoot: string; content: string; etag?: string }) {
  return (await client.put<ProductArtifactFile>(apiRoutes.productArtifact, payload)).data;
}

export async function fetchDesignArtifact(projectRoot: string) {
  return (await client.get<ProductArtifactFile>(apiRoutes.designArtifact, { params: { projectRoot } })).data;
}

export async function saveDesignArtifact(payload: { projectRoot: string; content: string; etag?: string }) {
  return (await client.put<ProductArtifactFile>(apiRoutes.designArtifact, payload)).data;
}
