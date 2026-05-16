import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { PhaseResult, PipelineContext, PipelineState, WorkLogEntry } from "@cli/pipeline/types.js";

let database: Database | null = null;

function getAppDataRoot(): string {
  return process.env.ZEROSHOT_DATA_ROOT ?? join(homedir(), ".zeroshot");
}

function getAppDatabasePath(): string {
  return process.env.ZEROSHOT_APP_DB ?? join(getAppDataRoot(), "zeroshot.sqlite");
}

async function getDatabase(): Promise<Database> {
  if (database) {
    return database;
  }
  const path = getAppDatabasePath();
  await mkdir(dirname(path), { recursive: true });
  database = new Database(path);
  database.exec(`
    create table if not exists pipeline_runs (
      project_root text not null,
      run_name text not null,
      run_dir text not null,
      mode text not null,
      status text not null,
      created_at text not null,
      finished_at text,
      previous_run_name text,
      work_log_html_path text,
      result_report_html_path text,
      primary key (project_root, run_name)
    );

    create table if not exists pipeline_state (
      project_root text not null,
      run_name text not null,
      state_json text not null,
      updated_at text not null,
      primary key (project_root, run_name)
    );

    create table if not exists pipeline_phase_results (
      id integer primary key autoincrement,
      project_root text not null,
      run_name text not null,
      seq integer not null,
      phase text not null,
      gate text not null,
      result_json text not null,
      created_at text not null
    );

    create table if not exists pipeline_events (
      id integer primary key autoincrement,
      project_root text not null,
      run_name text not null,
      seq integer not null,
      phase text not null,
      event_json text not null,
      created_at text not null
    );

    create table if not exists pipeline_usage (
      project_root text not null,
      run_name text not null,
      input_tokens integer not null default 0,
      output_tokens integer not null default 0,
      updated_at text not null,
      primary key (project_root, run_name)
    );
  `);
  return database;
}

export function createEmptyPipelineState(): PipelineState {
  return {
    goalSummary: "",
    workQueue: [],
    completedTasks: [],
    changedFiles: [],
    validation: [],
    openIssues: [],
    nextSteps: [],
    latestSummary: ""
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeWorkLogEntry(entry: WorkLogEntry): WorkLogEntry {
  return {
    title: entry.title || "Work item",
    summary: entry.summary || "",
    filesChanged: unique(entry.filesChanged ?? []),
    commandsRun: unique(entry.commandsRun ?? []),
    validationResult: entry.validationResult || "",
    result: entry.result || ""
  };
}

export async function createPipelineRun(ctx: PipelineContext): Promise<void> {
  const db = await getDatabase();
  db.query(`
    insert into pipeline_runs (
      project_root,
      run_name,
      run_dir,
      mode,
      status,
      created_at,
      previous_run_name
    )
    values (?, ?, ?, ?, ?, ?, ?)
  `).run(
    ctx.projectRoot,
    ctx.runName,
    ctx.runDir,
    ctx.mode,
    "running",
    ctx.createdAt,
    ctx.previousRunDir ? ctx.previousRunDir.split(/[\\/]/).at(-1) ?? null : null
  );
  await writePipelineState(ctx, createEmptyPipelineState());
}

export async function readPipelineState(ctx: PipelineContext): Promise<PipelineState> {
  const db = await getDatabase();
  const row = db.query<{ state_json: string }, [string, string]>(`
    select state_json
    from pipeline_state
    where project_root = ? and run_name = ?
  `).get(ctx.projectRoot, ctx.runName);
  return row ? JSON.parse(row.state_json) as PipelineState : createEmptyPipelineState();
}

export async function writePipelineState(ctx: PipelineContext, state: PipelineState): Promise<void> {
  const db = await getDatabase();
  db.query(`
    insert into pipeline_state (
      project_root,
      run_name,
      state_json,
      updated_at
    )
    values (?, ?, ?, ?)
    on conflict(project_root, run_name) do update set
      state_json = excluded.state_json,
      updated_at = excluded.updated_at
  `).run(ctx.projectRoot, ctx.runName, JSON.stringify(state), new Date().toISOString());
}

export async function mergePhaseResultIntoState(ctx: PipelineContext, result: PhaseResult): Promise<PipelineState> {
  const state = await readPipelineState(ctx);
  const nextState: PipelineState = {
    goalSummary: state.goalSummary || result.resultSummary || result.summary,
    workQueue: result.queueEmpty ? [] : state.workQueue,
    completedTasks: [
      ...state.completedTasks,
      ...result.workLogEntries.map(normalizeWorkLogEntry)
    ],
    changedFiles: unique([...state.changedFiles, ...result.changedFiles]),
    validation: unique([...state.validation, ...result.validation]),
    openIssues: unique([...state.openIssues, ...result.openIssues]),
    nextSteps: unique([...state.nextSteps, ...result.nextSteps]),
    latestSummary: result.resultSummary || result.summary || state.latestSummary
  };
  await writePipelineState(ctx, nextState);
  return nextState;
}

export async function recordPhaseResult(ctx: PipelineContext, phase: string, result: PhaseResult, resultJson: string): Promise<void> {
  const db = await getDatabase();
  db.query(`
    insert into pipeline_phase_results (
      project_root,
      run_name,
      seq,
      phase,
      gate,
      result_json,
      created_at
    )
    values (?, ?, ?, ?, ?, ?, ?)
  `).run(ctx.projectRoot, ctx.runName, ctx.phaseSeq, phase, result.gate, resultJson, new Date().toISOString());
}

export async function recordPipelineEvent(ctx: PipelineContext, phase: string, event: unknown): Promise<void> {
  const db = await getDatabase();
  db.query(`
    insert into pipeline_events (
      project_root,
      run_name,
      seq,
      phase,
      event_json,
      created_at
    )
    values (?, ?, ?, ?, ?, ?)
  `).run(ctx.projectRoot, ctx.runName, ctx.phaseSeq, phase, JSON.stringify(event), new Date().toISOString());
}

export async function addPipelineUsage(ctx: PipelineContext, inputTokens: number, outputTokens: number): Promise<void> {
  const db = await getDatabase();
  db.query(`
    insert into pipeline_usage (
      project_root,
      run_name,
      input_tokens,
      output_tokens,
      updated_at
    )
    values (?, ?, ?, ?, ?)
    on conflict(project_root, run_name) do update set
      input_tokens = input_tokens + excluded.input_tokens,
      output_tokens = output_tokens + excluded.output_tokens,
      updated_at = excluded.updated_at
  `).run(ctx.projectRoot, ctx.runName, inputTokens, outputTokens, new Date().toISOString());
}

export async function completePipelineRun(ctx: PipelineContext, status: "completed" | "failed", paths: { workLogHtml: string; resultReportHtml: string }): Promise<void> {
  const db = await getDatabase();
  db.query(`
    update pipeline_runs
    set
      status = ?,
      finished_at = ?,
      work_log_html_path = ?,
      result_report_html_path = ?
    where project_root = ? and run_name = ?
  `).run(status, new Date().toISOString(), paths.workLogHtml, paths.resultReportHtml, ctx.projectRoot, ctx.runName);
}
