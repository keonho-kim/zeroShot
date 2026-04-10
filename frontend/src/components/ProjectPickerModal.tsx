import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, Folder, FolderOpen, FolderPlus, FolderTree, House, Plus, Trash2, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { createProjectDirectory, deleteProjectDirectory, fetchAppSettings, fetchProjectTree, type DirectoryEntry } from "../lib/api";
import { useAppStore } from "../app/store";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: { data?: unknown } }).response?.data &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === "string"
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function isPathWithinRoot(root: string, target: string): boolean {
  const normalizedRoot = root.endsWith("/") && root !== "/" ? root.slice(0, -1) : root;
  return target === normalizedRoot || target.startsWith(`${normalizedRoot}/`);
}

function entrySignature(entry: DirectoryEntry): string {
  return [
    entry.path,
    entry.isDirectory ? "d" : "f",
    entry.isAllowedRoot ? "a" : "",
    entry.hasWorkHistory ? "h" : "",
    entry.runsCount ?? 0
  ].join("|");
}

function entriesSignature(entries: DirectoryEntry[]): string {
  return entries.map(entrySignature).join("::");
}

function mergeTreeChildren(
  treeChildrenByPath: Record<string, DirectoryEntry[]>,
  path: string,
  entries: DirectoryEntry[]
): Record<string, DirectoryEntry[]> {
  const current = treeChildrenByPath[path] ?? [];
  if (entriesSignature(current) === entriesSignature(entries)) {
    return treeChildrenByPath;
  }

  return {
    ...treeChildrenByPath,
    [path]: entries
  };
}

function pruneDeletedPath(treeChildrenByPath: Record<string, DirectoryEntry[]>, deletedPath: string): Record<string, DirectoryEntry[]> {
  return Object.fromEntries(
    Object.entries(treeChildrenByPath)
      .filter(([path]) => !isPathWithinRoot(deletedPath, path))
      .map(([path, entries]) => [path, entries.filter((entry) => !isPathWithinRoot(deletedPath, entry.path))])
  );
}

function PathBadge({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-1 text-[11px] font-medium",
        active
          ? "border-[var(--success-border)] bg-[var(--success-surface)] text-[var(--success-foreground)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)]"
      )}
    >
      {children}
    </span>
  );
}

function TreeRow({
  entry,
  depth,
  selected,
  expanded,
  childrenLoaded,
  onSelect,
  onToggle,
  onDoubleClick,
  onSelectProject,
  onDelete,
  selectionPending,
  deletePending
}: {
  entry: DirectoryEntry;
  depth: number;
  selected: boolean;
  expanded: boolean;
  childrenLoaded: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDoubleClick: () => void;
  onSelectProject: () => void;
  onDelete: () => void;
  selectionPending: boolean;
  deletePending: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "group grid w-full grid-cols-[32px_40px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition hover:bg-[var(--surface)]",
        selected && "bg-[var(--surface-active)]"
      )}
      style={{ paddingLeft: `${depth * 18 + 12}px` }}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-center justify-center">
        <button
          type="button"
          className="rounded-md p-1 transition hover:bg-[var(--surface-hover)]"
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
        >
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      </div>
      <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--muted)] text-[var(--primary)]">
        {selected || expanded ? <FolderOpen className="size-5" /> : <Folder className="size-5" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{entry.name}</p>
        <p className="truncate text-xs text-[var(--muted-foreground)]" title={entry.path}>{entry.path}</p>
      </div>
      <div className="flex justify-end pl-2">
        <div className="hidden flex-wrap items-center justify-end gap-2 group-hover:flex group-focus-within:flex">
          <Button variant="outline" className="h-8 px-3 py-1 text-xs" disabled={selectionPending} onClick={(event) => {
            event.stopPropagation();
            onSelectProject();
          }}>
            <FolderTree className="size-3.5" />
            프로젝트로 선택
          </Button>
          <Button
            variant="outline"
            className="h-8 border-[var(--danger-border)] px-3 py-1 text-xs text-[var(--danger-foreground)] hover:border-[var(--danger)] hover:bg-[var(--danger-surface)]"
            disabled={deletePending}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="size-3.5" />
            삭제
          </Button>
        </div>
        <div className="flex flex-wrap justify-end gap-2 group-hover:hidden group-focus-within:hidden">
          {entry.hasWorkHistory ? <PathBadge active={!!entry.runsCount}>{entry.runsCount ? `UPDATE (${entry.runsCount})` : "History"}</PathBadge> : <PathBadge>BUILD</PathBadge>}
          {!childrenLoaded && expanded ? <PathBadge>Loading</PathBadge> : null}
        </div>
      </div>
    </div>
  );
}

export function ProjectPickerModal({ open, onClose }: Props) {
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState<DirectoryEntry | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");
  const projectRoot = useAppStore((state) => state.projectRoot);
  const bootstrapRoots = useAppStore((state) => state.bootstrapRoots);
  const browserPath = useAppStore((state) => state.projectBrowserPath);
  const candidateProjectPath = useAppStore((state) => state.candidateProjectPath);
  const selectedBrowserEntryPath = useAppStore((state) => state.selectedBrowserEntryPath);
  const history = useAppStore((state) => state.projectPickerHistory);
  const historyIndex = useAppStore((state) => state.projectPickerHistoryIndex);
  const treeExpandedPaths = useAppStore((state) => state.treeExpandedPaths);
  const treeChildrenByPath = useAppStore((state) => state.treeChildrenByPath);
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
    const initialPath = browserPath || projectRoot || settingsQuery.data.bootstrapRoots[0] || "";
    if (!browserPath && initialPath) {
      setProjectBrowserPath(initialPath);
      setCandidateProjectPath(initialPath);
      setSelectedBrowserEntryPath(initialPath);
      setProjectPickerHistory([initialPath]);
      setProjectPickerHistoryIndex(0);
    }
  }, [
    open,
    settingsQuery.data,
    browserPath,
    projectRoot,
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
    if (nextTree === currentTree) {
      return;
    }

    setTreeChildrenByPath(nextTree);
  }, [browserPath, currentTreeQuery.data, setTreeChildrenByPath]);

  const createDirectoryMutation = useMutation({
    mutationFn: async () => createProjectDirectory(browserPath, pendingCreateDirName),
    onSuccess: async (entry) => {
      const currentTree = useAppStore.getState().treeChildrenByPath;
      const existing = currentTree[browserPath] ?? [];
      const nextEntries = [entry, ...existing.filter((item) => item.path !== entry.path)];
      const nextTree = mergeTreeChildren(currentTree, browserPath, nextEntries);
      if (nextTree !== currentTree) {
        setTreeChildrenByPath(nextTree);
      }
      setSelectedBrowserEntryPath(entry.path);
      setCandidateProjectPath(entry.path);
      setPendingCreateDirParentPath("");
      setPendingCreateDirName("");
    }
  });

  const currentPath = browserPath || "";
  const canGoBack = historyIndex > 0;
  const canGoUp = !!currentPath && !bootstrapRoots.includes(currentPath);
  const breadcrumb = useMemo(() => currentPath.split("/").filter(Boolean), [currentPath]);
  const currentEntries = treeChildrenByPath[currentPath] ?? currentTreeQuery.data?.entries ?? [];

  const selectProjectMutation = useMutation({
    mutationFn: async (path: string) => {
      if (!path) {
        throw new Error("No project selected");
      }
      return path;
    },
    onSuccess: async (path) => {
      setProjectRoot(path);
      setProjectState(null);
      onClose();
    }
  });

  const deleteDirectoryMutation = useMutation({
    mutationFn: async (entry: DirectoryEntry) => deleteProjectDirectory(entry.path),
    onSuccess: async (_data, entry) => {
      const currentTree = useAppStore.getState().treeChildrenByPath;
      setTreeChildrenByPath(pruneDeletedPath(currentTree, entry.path));
      setTreeExpandedPaths(treeExpandedPaths.filter((path) => !isPathWithinRoot(entry.path, path)));

      if (selectedBrowserEntryPath && isPathWithinRoot(entry.path, selectedBrowserEntryPath)) {
        setSelectedBrowserEntryPath(currentPath);
      }
      if (candidateProjectPath && isPathWithinRoot(entry.path, candidateProjectPath)) {
        setCandidateProjectPath(currentPath);
      }
      if (projectRoot && isPathWithinRoot(entry.path, projectRoot)) {
        setProjectRoot("");
        setProjectState(null);
      }

      setPendingDeleteEntry(null);
      setDeleteConfirmationName("");
    }
  });

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

  const toggleExpand = async (entry: DirectoryEntry) => {
    const isExpanded = treeExpandedPaths.includes(entry.path);
    if (isExpanded) {
      setTreeExpandedPaths(treeExpandedPaths.filter((path) => path !== entry.path));
      return;
    }

    setTreeExpandedPaths([...treeExpandedPaths, entry.path]);
    if (!treeChildrenByPath[entry.path]) {
      const response = await fetchProjectTree(entry.path);
      const currentTree = useAppStore.getState().treeChildrenByPath;
      const nextTree = mergeTreeChildren(currentTree, entry.path, response.entries);
      if (nextTree !== currentTree) {
        setTreeChildrenByPath(nextTree);
      }
    }
  };

  const renderTree = (entries: DirectoryEntry[], depth = 0): React.ReactNode[] =>
    entries.flatMap((entry) => {
      const expanded = treeExpandedPaths.includes(entry.path);
      const children = treeChildrenByPath[entry.path] ?? [];

      return [
        <Fragment key={entry.path}>
          <TreeRow
            entry={entry}
            depth={depth}
            selected={selectedBrowserEntryPath === entry.path}
            expanded={expanded}
            childrenLoaded={Boolean(treeChildrenByPath[entry.path])}
            onSelect={() => {
              setSelectedBrowserEntryPath(entry.path);
              setCandidateProjectPath(entry.path);
            }}
            onToggle={() => {
              void toggleExpand(entry);
            }}
            onDoubleClick={() => navigateTo(entry.path)}
            onSelectProject={() => selectProjectMutation.mutate(entry.path)}
            onDelete={() => {
              setPendingDeleteEntry(entry);
              setDeleteConfirmationName("");
            }}
            selectionPending={selectProjectMutation.isPending}
            deletePending={deleteDirectoryMutation.isPending}
          />
          {expanded ? renderTree(children, depth + 1) : null}
        </Fragment>
      ];
    });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-6">
      <Card className="max-h-[88vh] w-full max-w-7xl overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <p className="text-2xl font-black tracking-tight">프로젝트 선택</p>
            <p className="text-sm text-[var(--muted-foreground)]">single click은 선택, double click은 폴더 진입입니다.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="size-4" />
            닫기
          </Button>
        </div>

        <div className="border-b border-[var(--border)] px-6 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" disabled={!canGoBack} onClick={goBack}>
                <ChevronLeft className="size-4" />
                뒤로가기
              </Button>
              <Button variant="outline" disabled={!canGoUp} onClick={goUp}>
                <House className="size-4" />
                상위 폴더
              </Button>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
              <span className="shrink-0 font-medium">현재 경로</span>
              <span className="min-w-0 truncate text-[var(--muted-foreground)]" title={currentPath || "Bootstrap roots"}>
                {currentPath || "Bootstrap roots"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Button
                variant="outline"
                disabled={!currentPath}
                onClick={() => {
                  setPendingCreateDirParentPath(currentPath);
                  setPendingCreateDirName("");
                }}
              >
                <Plus className="size-4" />
                새 폴더
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {breadcrumb.length ? breadcrumb.map((part, index) => (
              <PathBadge key={`${part}-${index}`}>{part}</PathBadge>
            )) : <PathBadge>bootstrap roots</PathBadge>}
          </div>
        </div>

        <div className="flex min-h-[560px] min-w-0 flex-col">
          <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
            <span className="block truncate" title={currentPath ? `${currentPath} 탐색 중` : "탐색 시작점을 선택하세요"}>
              {currentPath ? `${currentPath} 탐색 중` : "탐색 시작점을 선택하세요"}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <div className="divide-y divide-[var(--border)]">
              {pendingCreateDirParentPath === currentPath ? (
                <div className="grid grid-cols-[32px_40px_minmax(0,1fr)] gap-3 px-3 py-2 md:grid-cols-[32px_40px_minmax(0,1fr)_auto] md:items-center">
                  <div />
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--muted)] text-[var(--primary)]">
                    <FolderPlus className="size-5" />
                  </div>
                  <Input
                    autoFocus
                    value={pendingCreateDirName}
                    placeholder="새 폴더 이름"
                    onChange={(event) => setPendingCreateDirName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setPendingCreateDirParentPath("");
                        setPendingCreateDirName("");
                      }
                      if (event.key === "Enter" && pendingCreateDirName.trim()) {
                        createDirectoryMutation.mutate();
                      }
                    }}
                  />
                  <div className="col-span-3 flex flex-wrap gap-2 md:col-span-1">
                    <Button
                      disabled={!pendingCreateDirName.trim() || createDirectoryMutation.isPending}
                      onClick={() => createDirectoryMutation.mutate()}
                    >
                      생성
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPendingCreateDirParentPath("");
                        setPendingCreateDirName("");
                      }}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              ) : null}
              {renderTree(currentEntries)}
              {!currentEntries.length && pendingCreateDirParentPath !== currentPath ? (
                <div className="px-4 py-10 text-center text-sm text-[var(--muted-foreground)]">표시할 디렉터리가 없습니다.</div>
              ) : null}
              {createDirectoryMutation.isError ? (
                <div className="mx-3 my-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-surface)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
                  {getErrorMessage(createDirectoryMutation.error, "새 폴더를 만들지 못했습니다. 이름 충돌 또는 잘못된 이름인지 확인하세요.")}
                </div>
              ) : null}
              {selectProjectMutation.isError ? (
                <div className="mx-3 my-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-surface)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
                  {getErrorMessage(selectProjectMutation.error, "프로젝트를 선택하지 못했습니다. 경로 권한을 확인하세요.")}
                </div>
              ) : null}
              {deleteDirectoryMutation.isError ? (
                <div className="mx-3 my-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-surface)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
                  {getErrorMessage(deleteDirectoryMutation.error, "폴더를 삭제하지 못했습니다. 경로와 권한을 확인하세요.")}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
      {pendingDeleteEntry ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--overlay-soft)] p-6">
          <Card className="w-full max-w-xl space-y-4">
            <div>
              <p className="text-xl font-black tracking-tight">정말 삭제하시겠습니까?</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                아래 폴더와 그 안의 모든 내용이 삭제됩니다.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-surface)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
              {pendingDeleteEntry.path}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-[var(--muted-foreground)]">삭제하려면 폴더 이름을 다시 입력하세요.</p>
              <Input
                autoFocus
                value={deleteConfirmationName}
                placeholder={pendingDeleteEntry.name}
                onChange={(event) => setDeleteConfirmationName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setPendingDeleteEntry(null);
                    setDeleteConfirmationName("");
                  }
                  if (event.key === "Enter" && deleteConfirmationName === pendingDeleteEntry.name) {
                    deleteDirectoryMutation.mutate(pendingDeleteEntry);
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPendingDeleteEntry(null);
                  setDeleteConfirmationName("");
                }}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                disabled={deleteConfirmationName !== pendingDeleteEntry.name || deleteDirectoryMutation.isPending}
                onClick={() => deleteDirectoryMutation.mutate(pendingDeleteEntry)}
              >
                삭제
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
