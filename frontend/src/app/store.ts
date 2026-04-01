import { create } from "zustand";
import type { JobSnapshot } from "../lib/api";

interface LogLine {
  type: "stdout" | "stderr" | "phase" | "job_started" | "job_finished" | "job_failed";
  text: string;
}

interface AppState {
  projectRoot: string;
  currentJob: JobSnapshot | null;
  logs: LogLine[];
  setProjectRoot: (value: string) => void;
  clearLogs: () => void;
  appendLog: (line: LogLine) => void;
  setCurrentJob: (job: JobSnapshot | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  projectRoot: "",
  currentJob: null,
  logs: [],
  setProjectRoot: (value) => set({ projectRoot: value }),
  clearLogs: () => set({ logs: [] }),
  appendLog: (line) => set((state) => ({ logs: [...state.logs, line] })),
  setCurrentJob: (job) => set({ currentJob: job })
}));
