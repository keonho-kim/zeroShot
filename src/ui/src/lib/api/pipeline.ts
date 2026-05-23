import type { JobSnapshot, PipelineOptions } from "@/types/api";
import { client } from "@/lib/api/client";
import { apiRoutes } from "@/lib/api/const/routes";

export async function startBuild(payload: { projectRoot: string; productContent?: string; options?: PipelineOptions }) {
  return (await client.post<JobSnapshot>(apiRoutes.build, payload)).data;
}
