import type { ProjectState } from "@/types/api";

export interface ProjectSelectionActions {
  setProjectRoot: (value: string) => void;
  setProjectState: (value: ProjectState | null) => void;
  setCandidateProjectPath: (value: string) => void;
  setSelectedBrowserEntryPath: (value: string) => void;
  setProjectPickerOpen: (value: boolean) => void;
}

export function isMissingSelectedProjectError(error: unknown): boolean {
  const response = (error as { response?: { status?: unknown } } | null)?.response;
  return response?.status === 404;
}

export function clearMissingProjectSelection(actions: ProjectSelectionActions): void {
  actions.setProjectRoot("");
  actions.setProjectState(null);
  actions.setCandidateProjectPath("");
  actions.setSelectedBrowserEntryPath("");
  actions.setProjectPickerOpen(true);
}
