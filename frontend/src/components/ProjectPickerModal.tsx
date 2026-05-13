import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, File, Folder, FolderOpen, FolderPlus, FolderTree, House, RefreshCcw, X } from "lucide-react";
import type { PointerEvent } from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import { createProjectDirectory, fetchAppSettings, fetchProjectTree } from "@/lib/api";
import type { DirectoryEntry } from "@/types/api";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";

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

function PathBadge({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-[11px] font-medium",
        active
          ? "bg-[var(--success-surface)] text-[var(--success-foreground)]"
          : "bg-[var(--surface)] text-[var(--muted-foreground)]"
      )}
    >
      {children}
    </span>
  );
}

function CreateDirectoryRow({
  depth,
  name,
  pending,
  onNameChange,
  onSubmit,
  onCancel
}: {
  depth: number;
  name: string;
  pending: boolean;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="grid grid-cols-[32px_40px_minmax(0,1fr)] gap-3 px-3 py-2 md:grid-cols-[32px_40px_minmax(0,1fr)_auto] md:items-center"
      style={{ paddingLeft: `${depth * 18 + 12}px` }}
    >
      <div />
      <div className="flex size-10 items-center justify-center rounded-md bg-[var(--muted)] text-[var(--primary)]">
        <FolderPlus className="size-5" />
      </div>
      <Input
        autoFocus
        value={name}
        placeholder="새 폴더 이름"
        onChange={(event) => onNameChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
          }
          if (event.key === "Enter" && name.trim()) {
            onSubmit();
          }
        }}
      />
      <div className="col-span-3 flex flex-wrap gap-2 md:col-span-1">
        <Button disabled={!name.trim() || pending} onClick={onSubmit}>
          생성
        </Button>
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
}

function TreeRow({
  entry,
  depth,
  selected,
  current,
  expanded,
  childrenLoaded,
  loadError,
  onToggle,
  onExpand,
  onCreateDirectory,
  onSelectProject,
  createPending,
  selectionPending
}: {
  entry: DirectoryEntry;
  depth: number;
  selected: boolean;
  current: boolean;
  expanded: boolean;
  childrenLoaded: boolean;
  loadError: string;
  onToggle: () => void;
  onExpand: () => void;
  onCreateDirectory: () => void;
  onSelectProject: () => void;
  createPending: boolean;
  selectionPending: boolean;
}) {
  const canOpen = entry.isDirectory;

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "grid w-full grid-cols-[32px_40px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-[var(--surface)]",
        selected && "bg-[var(--surface-active)]"
      )}
      style={{ paddingLeft: `${depth * 18 + 12}px` }}
      onClick={() => {
        if (canOpen) {
          onExpand();
        }
      }}
      onKeyDown={(event) => {
        if (canOpen && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onExpand();
        }
      }}
    >
      <div className="flex items-center justify-center">
        {canOpen ? (
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
        ) : null}
      </div>
      <div className="flex size-10 items-center justify-center rounded-md bg-[var(--muted)] text-[var(--primary)]">
        {entry.isDirectory ? selected || expanded ? <FolderOpen className="size-5" /> : <Folder className="size-5" /> : <File className="size-5" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{entry.name}</p>
        <p className="truncate text-xs text-[var(--muted-foreground)]" title={entry.path}>{entry.path}</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 pl-2">
        {!childrenLoaded && expanded && !loadError ? <PathBadge>Loading</PathBadge> : null}
        {loadError ? <PathBadge>{loadError}</PathBadge> : null}
        {selected && entry.isDirectory ? (
          <Button
            variant="outline"
            className="h-8 px-3 py-1 text-xs"
            disabled={createPending}
            onClick={(event) => {
              event.stopPropagation();
              onCreateDirectory();
            }}
          >
            <FolderPlus className="size-3.5" />
            새 폴더
          </Button>
        ) : null}
        {current ? (
          <PathBadge active>현재 BUILD</PathBadge>
        ) : entry.isDirectory ? (
          <Button
            variant="outline"
            className="h-8 px-3 py-1 text-xs"
            disabled={selectionPending}
            onClick={(event) => {
              event.stopPropagation();
              onSelectProject();
            }}
          >
            <FolderTree className="size-3.5" />
            선택
          </Button>
        ) : null}
        {entry.hasWorkHistory ? <PathBadge active={!!entry.runsCount}>{entry.runsCount ? `UPDATE (${entry.runsCount})` : "History"}</PathBadge> : null}
      </div>
    </div>
  );
}

export function ProjectPickerModal({ open, onClose }: Props) {
  const [treeDragging, setTreeDragging] = useState(false);
  const [treeLoadErrors, setTreeLoadErrors] = useState<Record<string, string>>({});
  const treeDragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
    dragged: boolean;
  } | null>(null);
  const suppressTreeClickRef = useRef(false);
  const projectRoot = useAppStore((state) => state.projectRoot);
  const bootstrapRoots = useAppStore((state) => state.bootstrapRoots);
  const browserPath = useAppStore((state) => state.projectBrowserPath);
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
    const initialPath = browserPath || settingsQuery.data.bootstrapRoots[0] || projectRoot || "";
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
    mutationFn: async ({ parentPath, name }: { parentPath: string; name: string }) => createProjectDirectory(parentPath, name),
    onSuccess: async (entry, variables) => {
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

  const currentPath = browserPath || "";
  const canGoBack = historyIndex > 0;
  const canGoUp = !!currentPath && !bootstrapRoots.includes(currentPath);
  const currentEntries = treeChildrenByPath[currentPath] ?? currentTreeQuery.data?.entries ?? [];

  const cancelCreateDirectory = () => {
    setPendingCreateDirParentPath("");
    setPendingCreateDirName("");
  };

  const submitCreateDirectory = () => {
    const parentPath = pendingCreateDirParentPath || currentPath;
    const name = pendingCreateDirName.trim();
    if (!parentPath || !name) {
      return;
    }

    createDirectoryMutation.mutate({ parentPath, name });
  };

  const startCreateDirectory = (parentPath: string) => {
    setPendingCreateDirParentPath(parentPath);
    setPendingCreateDirName("");
    if (parentPath !== currentPath && !treeExpandedPaths.includes(parentPath)) {
      setTreeExpandedPaths([...treeExpandedPaths, parentPath]);
    }
  };

  const loadTreeChildren = async (path: string) => {
    setTreeLoadErrors((errors) => {
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
      setTreeLoadErrors((errors) => ({
        ...errors,
        [path]: getErrorMessage(error, "Load failed")
      }));
    }
  };

  const startTreeDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    if ((event.target as HTMLElement).closest("button,input,textarea,select,a")) {
      return;
    }

    treeDragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
      dragged: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveTreeDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = treeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    if (!drag.dragged && Math.hypot(deltaX, deltaY) > 6) {
      drag.dragged = true;
      suppressTreeClickRef.current = true;
      setTreeDragging(true);
    }

    event.currentTarget.scrollLeft = drag.scrollLeft - deltaX;
    event.currentTarget.scrollTop = drag.scrollTop - deltaY;
  };

  const stopTreeDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = treeDragRef.current;
    if (drag?.pointerId === event.pointerId) {
      treeDragRef.current = null;
      setTreeDragging(false);
      if (drag.dragged) {
        window.setTimeout(() => {
          suppressTreeClickRef.current = false;
        }, 120);
      }
    }
  };

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
    if (!entry.isDirectory) {
      return;
    }

    setSelectedBrowserEntryPath(entry.path);
    setCandidateProjectPath(entry.path);

    const currentExpandedPaths = useAppStore.getState().treeExpandedPaths;
    const isExpanded = currentExpandedPaths.includes(entry.path);
    if (isExpanded) {
      setTreeExpandedPaths(currentExpandedPaths.filter((path) => path !== entry.path));
      return;
    }

    setTreeExpandedPaths([...currentExpandedPaths, entry.path]);
    if (!useAppStore.getState().treeChildrenByPath[entry.path]) {
      await loadTreeChildren(entry.path);
    }
  };

  const expandEntry = async (entry: DirectoryEntry) => {
    if (!entry.isDirectory) {
      return;
    }

    setSelectedBrowserEntryPath(entry.path);
    setCandidateProjectPath(entry.path);

    const currentExpandedPaths = useAppStore.getState().treeExpandedPaths;
    if (currentExpandedPaths.includes(entry.path)) {
      return;
    }

    setTreeExpandedPaths([...currentExpandedPaths, entry.path]);
    if (!useAppStore.getState().treeChildrenByPath[entry.path]) {
      await loadTreeChildren(entry.path);
    }
  };

  const renderCreateDirectoryRow = (depth: number) => (
    <CreateDirectoryRow
      depth={depth}
      name={pendingCreateDirName}
      pending={createDirectoryMutation.isPending}
      onNameChange={setPendingCreateDirName}
      onSubmit={submitCreateDirectory}
      onCancel={cancelCreateDirectory}
    />
  );

  const renderTree = (entries: DirectoryEntry[], depth = 0): React.ReactNode[] =>
    entries.flatMap((entry) => {
      const expanded = treeExpandedPaths.includes(entry.path);
      const children = treeChildrenByPath[entry.path] ?? [];
      const loadError = treeLoadErrors[entry.path] ?? "";
      const shouldRenderCreateRow = pendingCreateDirParentPath === entry.path;

      return [
        <Fragment key={entry.path}>
          <TreeRow
            entry={entry}
            depth={depth}
            selected={selectedBrowserEntryPath === entry.path}
            current={projectRoot === entry.path}
            expanded={expanded}
            childrenLoaded={Boolean(treeChildrenByPath[entry.path]) || Boolean(loadError)}
            loadError={loadError}
            onToggle={() => {
              void toggleExpand(entry);
            }}
            onExpand={() => {
              void expandEntry(entry);
            }}
            onCreateDirectory={() => startCreateDirectory(entry.path)}
            onSelectProject={() => selectProjectMutation.mutate(entry.path)}
            createPending={createDirectoryMutation.isPending}
            selectionPending={selectProjectMutation.isPending}
          />
          {shouldRenderCreateRow ? renderCreateDirectoryRow(depth + 1) : null}
          {expanded && loadError ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--danger-foreground)]" style={{ paddingLeft: `${(depth + 1) * 18 + 12}px` }}>
              <span className="min-w-0 flex-1 truncate">{loadError}</span>
              <Button variant="outline" className="h-8 px-3 py-1 text-xs" onClick={() => void loadTreeChildren(entry.path)}>
                <RefreshCcw className="size-3.5" />
                다시 시도
              </Button>
            </div>
          ) : null}
          {expanded ? renderTree(children, depth + 1) : null}
        </Fragment>
      ];
    });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-6">
      <Card className="flex h-[min(88vh,780px)] w-full max-w-7xl flex-col overflow-hidden bg-[var(--panel)] p-0 shadow-[var(--shadow-popover)]">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-2xl font-semibold tracking-[-0.02em]">프로젝트 선택</p>
            <p className="text-sm text-[var(--muted-foreground)]">폴더를 한 번 누르면 하위 디렉터리가 열립니다. 프로젝트 지정은 우측 선택 버튼을 사용하세요.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="size-4" />
            닫기
          </Button>
        </div>

        <div className="px-6 py-4">
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
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
            <span className="block truncate" title={currentPath ? `${currentPath} 탐색 중` : "탐색 시작점을 선택하세요"}>
              {currentPath ? `${currentPath} 탐색 중` : "탐색 시작점을 선택하세요"}
            </span>
          </div>
          <div
            className={cn("project-tree-scroll min-h-0 flex-1 overflow-auto", treeDragging && "dragging")}
            onPointerDown={startTreeDrag}
            onPointerMove={moveTreeDrag}
            onPointerUp={stopTreeDrag}
            onPointerCancel={stopTreeDrag}
            onClickCapture={(event) => {
              if (!suppressTreeClickRef.current) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              suppressTreeClickRef.current = false;
            }}
          >
            <div className="flex flex-col gap-1 p-2">
              {renderTree(currentEntries)}
              {!currentEntries.length && pendingCreateDirParentPath !== currentPath ? (
                <div className="px-4 py-10 text-center text-sm text-[var(--muted-foreground)]">표시할 디렉터리가 없습니다.</div>
              ) : null}
              {createDirectoryMutation.isError ? (
                <div className="mx-3 my-3 rounded-md bg-[var(--danger-surface)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
                  {getErrorMessage(createDirectoryMutation.error, "새 폴더를 만들지 못했습니다. 이름 충돌 또는 잘못된 이름인지 확인하세요.")}
                </div>
              ) : null}
              {selectProjectMutation.isError ? (
                <div className="mx-3 my-3 rounded-md bg-[var(--danger-surface)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
                  {getErrorMessage(selectProjectMutation.error, "프로젝트를 선택하지 못했습니다. 경로 권한을 확인하세요.")}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
