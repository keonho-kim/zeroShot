import { client } from "@/lib/api/client";
import { apiRoutes } from "@/lib/api/const/routes";

export async function highlightCode(payload: { code: string; language: string }) {
  return (await client.post<{ html: string; language: string }>(apiRoutes.highlight, payload)).data;
}
