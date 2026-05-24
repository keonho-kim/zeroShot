import type { RunDetail, RunSummary, WorkflowLogBoard, WorkflowLogRecordDetail, WorkLogProjectSummary } from "@/types/api";
import { client } from "@/lib/api/client";
import { apiRoutes } from "@/lib/api/const/routes";

export async function fetchRuns(projectRoot: string) {
  return (await client.get<{ runs: RunSummary[] }>(apiRoutes.history, { params: { projectRoot } })).data.runs;
}

export async function fetchRunDetail(projectRoot: string, runName: string) {
  return (await client.get<RunDetail>(`${apiRoutes.history}/${runName}`, { params: { projectRoot } })).data;
}

export async function fetchWorkLogProjects() {
  return (await client.get<{ projects: WorkLogProjectSummary[] }>(apiRoutes.historyProjects)).data.projects;
}

export async function fetchWorkflowLogBoard(projectRoot: string) {
  return (await client.get<WorkflowLogBoard>(apiRoutes.historyBoard, { params: { projectRoot } })).data;
}

export async function fetchWorkflowLogRecord(projectRoot: string, recordId: string) {
  return (await client.get<WorkflowLogRecordDetail>(`${apiRoutes.history}/records/${encodeURIComponent(recordId)}`, { params: { projectRoot } })).data;
}
