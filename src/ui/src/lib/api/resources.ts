import type { ResourceManifest } from "@/types/api";
import { client } from "@/lib/api/client";
import { apiRoutes } from "@/lib/api/const/routes";

export async function fetchResources() {
  return (await client.get<{ skills: ResourceManifest[]; designTemplates: ResourceManifest[]; designSystems: ResourceManifest[] }>(apiRoutes.resources)).data;
}
