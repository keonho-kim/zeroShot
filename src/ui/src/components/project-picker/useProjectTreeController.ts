import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchAppSettings } from "@/lib/api/settings";
import { createProjectDirectory, fetchProjectTree } from "@/lib/api/projects";
import { useAppStore } from "@/stores/app-store";
import type { DirectoryEntry } from "@/types/api";
import { getErrorMessage, mergeTreeChildren } from "@/components/project-picker/project-picker-utils";

function hasLoadedChildren(path: string): boolean {
  return Object.hasOwn(useAppStore.getState().treeChildrenByPath, path);
}

export function useProjectTreeController({
  open,
  freshStart = false,
  onClose,
  onProjectSelected
}: {
  open: boolean;
  freshStart?: boolean;
  onClose: () => void;
  onProjectSelected?: (projectRoot: string) => void;
}) {
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({});
  const projectRoot = useAppStore((state) => state.projectRoot);
  const candidateProjectPath = useAppStore((state) => state.candidateProjectPath);
  const bootstrapRoots = useAppStore((state) => state.bootstrapRoots);
  const browserPath = useAppStore((state) => state.projectBrowserPath);
  const selectedPath = useAppStore((state) => state.selectedBrowserEntryPath);
  const history = useAppStore((state) => state.projectPickerHistory);
  const historyIndex = useAppStore((state) => state.projectPickerHistoryIndex);
  const expandedPaths = useAppStore((state) => state.treeExpandedPaths);
  const childrenByPath = useAppStore((state) => state.treeChildrenByPath);
  const pendingCreateDirParentPath = useAppStore((state) => state.pendingCreateDirParentPath);
  const pendingCreateDirName = useAppStore((state) => state.pendingCreateDirName);
  const setBootstrapRoots = useAppStore((state) => state.setBootstrapRoots);
  const setProjectRoot = useAppStore((state) => state.setProjectRoot);
  const setProjectState = useAppStore((state) => state.setProjectState);
  const setProjectBrowserPath = useAppStore((state) => state.setProjectBrowserPath);
  const setCandidateProjectPath = useAppStore((state) => state.setCandidateProjectPath);
  const setSelectedBrowserEntryPath = useAppStore((state) => state.setSelectedBrowserEntryPath);
  const setProjectPickerHistory = useAppStore((state) => state.setProjectPickerHistory);
  const setProjectPickerHistoryIndex = useAppStore((state) => state.setProjectPickerHistoryIndex);
  const setTreeExpandedPaths = useAppStore((state) => state.setTreeExpandedPaths);
  const setTreeChildrenByPath = useAppStore((state) => state.setTreeChildrenByPath);
  const setPendingCreateDirParentPath = useAppStore((state) => state.setPendingCreateDirParentPath);
  const setPendingCreateDirName = useAppStore((state) => state.setPendingCreateDirName);

  const settingsQuery = useQuery({
    queryKey: ["app-settings"],
    queryFn: fetchAppSettings,
    enabled: open
  });
  const currentTreeQuery = useQuery({
    queryKey: ["project-tree", browserPath],
    queryFn: () => fetchProjectTree(browserPath || undefined),
    enabled: open && Boolean(browserPath)
  });

  useEffect(() => {
    if (!open || !settingsQuery.data) {
      return;
    }

    setBootstrapRoots(settingsQuery.data.bootstrapRoots);
    const initialPath = browserPath || settingsQuery.data.bootstrapRoots[0] || (freshStart ? "" : projectRoot) || "";
    if (!browserPath && initialPath) {
      setProjectBrowserPath(initialPath);
      setCandidateProjectPath(freshStart ? "" : initialPath);
      setSelectedBrowserEntryPath(freshStart ? "" : candidateProjectPath || projectRoot || initialPath);
      setProjectPickerHistory([initialPath]);
      setProjectPickerHistoryIndex(0);
      return;
    }

    if (!freshStart && !selectedPath && (candidateProjectPath || projectRoot)) {
      setSelectedBrowserEntryPath(candidateProjectPath || projectRoot);
    }
  }, [
    open,
    freshStart,
    settingsQuery.data,
    browserPath,
    candidateProjectPath,
    projectRoot,
    selectedPath,
    setBootstrapRoots,
    setProjectBrowserPath,
    setCandidateProjectPath,
    setSelectedBrowserEntryPath,
    setProjectPickerHistory,
    setProjectPickerHistoryIndex
  ]);

  useEffect(() => {
    if (!browserPath || !currentTreeQuery.data) {
      return;
    }

    const currentTree = useAppStore.getState().treeChildrenByPath;
    const nextTree = mergeTreeChildren(currentTree, browserPath, currentTreeQuery.data.entries);
    if (nextTree !== currentTree) {
      setTreeChildrenByPath(nextTree);
    }
  }, [browserPath, currentTreeQuery.data, setTreeChildrenByPath]);

  const createDirectoryMutation = useMutation({
    mutationFn: async ({ parentPath, name }: { parentPath: string; name: string }) => createProjectDirectory(parentPath, name),
    onSuccess: (entry, variables) => {
      const currentTree = useAppStore.getState().treeChildrenByPath;
      const existing = currentTree[variables.parentPath] ?? [];
      const nextEntries = [entry, ...existing.filter((item) => item.path !== entry.path)];
      const nextTree = mergeTreeChildren(currentTree, variables.parentPath, nextEntries);
      if (nextTree !== currentTree) {
        setTreeChildrenByPath(nextTree);
      }
      if (variables.parentPath !== browserPath && !useAppStore.getState().treeExpandedPaths.includes(variables.parentPath)) {
        setTreeExpandedPaths([...useAppStore.getState().treeExpandedPaths, variables.parentPath]);
      }
      setSelectedBrowserEntryPath(entry.path);
      setCandidateProjectPath(entry.path);
      setPendingCreateDirParentPath("");
      setPendingCreateDirName("");
    }
  });

  const selectProjectMutation = useMutation({
    mutationFn: async (path: string) => {
      if (!path) {
        throw new Error("No project selected");
      }
      return path;
    },
    onSuccess: (path) => {
      setProjectRoot(path);
      setProjectState(null);
      onClose();
      onProjectSelected?.(path);
    }
  });

  const currentPath = browserPath || "";
  const currentEntries = childrenByPath[currentPath] ?? currentTreeQuery.data?.entries ?? [];
  const canGoBack = historyIndex > 0;
  const canGoUp = !!currentPath && !bootstrapRoots.includes(currentPath);

  const selectBrowserPath = (path: string) => {
    setSelectedBrowserEntryPath(path);
    setCandidateProjectPath(path);
  };

  const loadChildren = async (path: string) => {
    setLoadErrors((errors) => {
      const next = { ...errors };
      delete next[path];
      return next;
    });

    try {
      const response = await fetchProjectTree(path);
      const currentTree = useAppStore.getState().treeChildrenByPath;
      const nextTree = mergeTreeChildren(currentTree, path, response.entries);
      if (nextTree !== currentTree) {
        setTreeChildrenByPath(nextTree);
      }
    } catch (error) {
      setLoadErrors((errors) => ({
        ...errors,
        [path]: getErrorMessage(error, "Load failed")
      }));
    }
  };

  const toggle = async (entry: DirectoryEntry) => {
    if (!entry.isDirectory) {
      return;
    }

    const currentExpandedPaths = useAppStore.getState().treeExpandedPaths;
    if (currentExpandedPaths.includes(entry.path)) {
      setTreeExpandedPaths(currentExpandedPaths.filter((path) => path !== entry.path));
      return;
    }

    setTreeExpandedPaths([...currentExpandedPaths, entry.path]);
    if (!hasLoadedChildren(entry.path)) {
      await loadChildren(entry.path);
    }
  };

  const selectAndExpand = async (entry: DirectoryEntry) => {
    if (!entry.isDirectory) {
      return;
    }

    selectBrowserPath(entry.path);
    const currentExpandedPaths = useAppStore.getState().treeExpandedPaths;
    if (currentExpandedPaths.includes(entry.path)) {
      return;
    }

    setTreeExpandedPaths([...currentExpandedPaths, entry.path]);
    if (!hasLoadedChildren(entry.path)) {
      await loadChildren(entry.path);
    }
  };

  const startCreate = (parentPath: string) => {
    setPendingCreateDirParentPath(parentPath);
    setPendingCreateDirName("");
    const currentExpandedPaths = useAppStore.getState().treeExpandedPaths;
    if (parentPath !== currentPath && !currentExpandedPaths.includes(parentPath)) {
      setTreeExpandedPaths([...currentExpandedPaths, parentPath]);
    }
  };

  const cancelCreate = () => {
    setPendingCreateDirParentPath("");
    setPendingCreateDirName("");
  };

  const submitCreate = () => {
    const parentPath = pendingCreateDirParentPath || currentPath;
    const name = pendingCreateDirName.trim();
    if (!parentPath || !name) {
      return;
    }

    createDirectoryMutation.mutate({ parentPath, name });
  };

  const selectProject = (path: string) => {
    selectProjectMutation.mutate(path);
  };

  const navigateTo = (path: string) => {
    setProjectBrowserPath(path);
    setCandidateProjectPath(path);
    setSelectedBrowserEntryPath(path);
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(path);
    setProjectPickerHistory(nextHistory);
    setProjectPickerHistoryIndex(nextHistory.length - 1);
  };

  const goBack = () => {
    if (!canGoBack) {
      return;
    }
    const nextIndex = historyIndex - 1;
    const nextPath = history[nextIndex];
    setProjectPickerHistoryIndex(nextIndex);
    setProjectBrowserPath(nextPath);
    setCandidateProjectPath(nextPath);
    setSelectedBrowserEntryPath(nextPath);
  };

  const goUp = () => {
    if (!canGoUp) {
      return;
    }
    const parent = currentPath.split("/").slice(0, -1).join("/") || "/";
    navigateTo(parent);
  };

  return {
    projectRoot,
    currentPath,
    currentEntries,
    selectedPath,
    expandedPaths,
    childrenByPath,
    loadErrors,
    pendingCreateDir: {
      parentPath: pendingCreateDirParentPath,
      name: pendingCreateDirName
    },
    createPending: createDirectoryMutation.isPending,
    createError: createDirectoryMutation.error,
    createFailed: createDirectoryMutation.isError,
    selectionPending: selectProjectMutation.isPending,
    selectionError: selectProjectMutation.error,
    selectionFailed: selectProjectMutation.isError,
    canGoBack,
    canGoUp,
    goBack,
    goUp,
    toggle,
    selectAndExpand,
    loadChildren,
    startCreate,
    selectProject,
    submitCreate,
    cancelCreate,
    setPendingCreateName: setPendingCreateDirName
  };
}
