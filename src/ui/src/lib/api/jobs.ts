import type { JobSnapshot } from "@/types/api";
import { client } from "@/lib/api/client";
import { apiRoutes } from "@/lib/api/const/routes";

export async function fetchCurrentJob() {
  return (await client.get<JobSnapshot | null>(apiRoutes.currentJob)).data;
}
