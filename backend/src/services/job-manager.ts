import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { loadAppConfig } from "../config/app-config.js";
import { buildShellCommandSpec } from "../core/cli-command.js";
import type { JobEvent, JobSnapshot, PipelineOptions, RunMode } from "../types.js";

const PHASE_NAMES = new Set(["prepare", "normalize", "iter", "replan", "validate", "sync-product", "closeout", "build", "codex"]);

class JobManager {
  private emitter = new EventEmitter();
  private currentJob: JobSnapshot | null = null;
  private currentJobId: string | null = null;
  private seq = 0;
  private eventHistory = new Map<string, JobEvent[]>();

  getCurrentJob(): JobSnapshot | null {
    return this.currentJob;
  }

  getEvents(jobId: string): JobEvent[] {
    return this.eventHistory.get(jobId) ?? [];
  }

  subscribe(jobId: string, listener: (event: JobEvent) => void): () => void {
    const eventName = `job:${jobId}`;
    this.emitter.on(eventName, listener);
    return () => this.emitter.off(eventName, listener);
  }

  private publish(jobId: string, type: JobEvent["type"], data: Record<string, unknown>) {
    const event: JobEvent = { seq: ++this.seq, type, data };
    const history = this.eventHistory.get(jobId) ?? [];
    history.push(event);
    this.eventHistory.set(jobId, history.slice(-500));
    this.emitter.emit(`job:${jobId}`, event);
  }

  async start(mode: RunMode, projectRoot: string, options: PipelineOptions = {}): Promise<JobSnapshot> {
    if (this.currentJob?.status === "running") {
      throw Object.assign(new Error("A job is already running"), { statusCode: 409 });
    }

    const appConfig = await loadAppConfig();
    const spec = buildShellCommandSpec(mode, projectRoot, appConfig.defaults, options);
    const jobId = crypto.randomUUID();

    this.currentJobId = jobId;
    this.currentJob = {
      id: jobId,
      mode,
      projectRoot,
      status: "running",
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString()
    };
    this.eventHistory.set(jobId, []);
    this.publish(jobId, "job_started", { ...this.currentJob });

    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      env: spec.env
    });

    const attach = (stream: NodeJS.ReadableStream | null, type: "stdout" | "stderr") => {
      if (!stream) {
        return;
      }

      const reader = createInterface({ input: stream });
      reader.on("line", (line) => {
        this.publish(jobId, type, { line });
        const match = /^\[(?<phase>[^\]]+)\]/.exec(line);
        const phase = match?.groups?.phase;
        if (phase && PHASE_NAMES.has(phase)) {
          this.publish(jobId, "phase", { phase, line });
        }
      });
    };

    attach(child.stdout, "stdout");
    attach(child.stderr, "stderr");

    child.on("close", (exitCode) => {
      if (!this.currentJob || this.currentJob.id !== jobId) {
        return;
      }

      const status = exitCode === 0 ? "completed" : "failed";
      this.currentJob = {
        ...this.currentJob,
        status,
        exitCode: exitCode ?? 1,
        finishedAt: new Date().toISOString()
      };

      this.publish(jobId, status === "completed" ? "job_finished" : "job_failed", {
        exitCode: exitCode ?? 1,
        status
      });
    });

    child.on("error", (error) => {
      this.currentJob = {
        ...(this.currentJob ?? {
          id: jobId,
          mode,
          projectRoot,
          createdAt: new Date().toISOString()
        }),
        status: "failed",
        exitCode: 1,
        finishedAt: new Date().toISOString()
      };
      this.publish(jobId, "job_failed", { message: error.message });
    });

    return this.currentJob;
  }
}

export const jobManager = new JobManager();
