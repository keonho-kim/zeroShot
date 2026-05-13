import { create } from "zustand";
import type { AuthStatus, DirectoryEntry, JobSnapshot, ProjectState } from "@/types/api";

export interface LogLine {
  type: "stdout" | "stderr" | "phase" | "job_started" | "job_finished" | "job_failed";
  text: string;
}

interface AppState {
  authStatus: AuthStatus | null;
  bootstrapRoots: string[];
  projectRoot: string;
  projectState: ProjectState | null;
  architectProductContent: string;
  currentJob: JobSnapshot | null;
  logs: LogLine[];
  isProjectPickerOpen: boolean;
  projectBrowserPath: string;
  candidateProjectPath: string;
  selectedBrowserEntryPath: string;
  projectPickerHistory: string[];
  projectPickerHistoryIndex: number;
  treeExpandedPaths: string[];
  treeChildrenByPath: Record<string, DirectoryEntry[]>;
  treeLoadingPaths: string[];
  pendingCreateDirParentPath: string;
  pendingCreateDirName: string;
  setAuthStatus: (value: AuthStatus | null) => void;
  setBootstrapRoots: (value: string[]) => void;
  setProjectRoot: (value: string) => void;
  setProjectState: (value: ProjectState | null) => void;
  setArchitectProductContent: (value: string) => void;
  setProjectPickerOpen: (value: boolean) => void;
  setProjectBrowserPath: (value: string) => void;
  setCandidateProjectPath: (value: string) => void;
  setSelectedBrowserEntryPath: (value: string) => void;
  setProjectPickerHistory: (value: string[]) => void;
  setProjectPickerHistoryIndex: (value: number) => void;
  setTreeExpandedPaths: (value: string[]) => void;
  setTreeChildrenByPath: (value: Record<string, DirectoryEntry[]>) => void;
  setTreeLoadingPaths: (value: string[]) => void;
  setPendingCreateDirParentPath: (value: string) => void;
  setPendingCreateDirName: (value: string) => void;
  clearLogs: () => void;
  appendLog: (line: LogLine) => void;
  setCurrentJob: (job: JobSnapshot | null) => void;
}

const projectRootStorageKey = "zeroshot.projectRoot";

function readStoredProjectRoot(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(projectRootStorageKey) ?? "";
}

function storeProjectRoot(value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  if (value) {
    window.localStorage.setItem(projectRootStorageKey, value);
    return;
  }
  window.localStorage.removeItem(projectRootStorageKey);
}

const initialProjectRoot = readStoredProjectRoot();

export const useAppStore = create<AppState>((set) => ({
  authStatus: null,
  bootstrapRoots: [],
  projectRoot: initialProjectRoot,
  projectState: null,
  architectProductContent: "",
  currentJob: null,
  logs: [],
  isProjectPickerOpen: false,
  projectBrowserPath: "",
  candidateProjectPath: initialProjectRoot,
  selectedBrowserEntryPath: "",
  projectPickerHistory: [],
  projectPickerHistoryIndex: -1,
  treeExpandedPaths: [],
  treeChildrenByPath: {},
  treeLoadingPaths: [],
  pendingCreateDirParentPath: "",
  pendingCreateDirName: "",
  setAuthStatus: (value) => set({ authStatus: value }),
  setBootstrapRoots: (value) => set({ bootstrapRoots: value }),
  setProjectRoot: (value) => {
    storeProjectRoot(value);
    set({ projectRoot: value, candidateProjectPath: value });
  },
  setProjectState: (value) => set({ projectState: value }),
  setArchitectProductContent: (value) => set({ architectProductContent: value }),
  setProjectPickerOpen: (value) => set({ isProjectPickerOpen: value }),
  setProjectBrowserPath: (value) => set({ projectBrowserPath: value }),
  setCandidateProjectPath: (value) => set({ candidateProjectPath: value }),
  setSelectedBrowserEntryPath: (value) => set({ selectedBrowserEntryPath: value }),
  setProjectPickerHistory: (value) => set({ projectPickerHistory: value }),
  setProjectPickerHistoryIndex: (value) => set({ projectPickerHistoryIndex: value }),
  setTreeExpandedPaths: (value) => set({ treeExpandedPaths: value }),
  setTreeChildrenByPath: (value) => set({ treeChildrenByPath: value }),
  setTreeLoadingPaths: (value) => set({ treeLoadingPaths: value }),
  setPendingCreateDirParentPath: (value) => set({ pendingCreateDirParentPath: value }),
  setPendingCreateDirName: (value) => set({ pendingCreateDirName: value }),
  clearLogs: () => set({ logs: [] }),
  appendLog: (line) => set((state) => ({ logs: [...state.logs, line] })),
  setCurrentJob: (job) => set({ currentJob: job })
}));
