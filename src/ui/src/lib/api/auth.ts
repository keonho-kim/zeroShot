import type { AuthStatus } from "@/types/api";
import { client } from "@/lib/api/client";
import { apiRoutes } from "@/lib/api/const/routes";

export async function fetchAuthStatus() {
  return (await client.get<AuthStatus>(apiRoutes.authStatus)).data;
}

export async function saveAuthStatus(content: string) {
  return (await client.put<AuthStatus>(apiRoutes.auth, { content })).data;
}
