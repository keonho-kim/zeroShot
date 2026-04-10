import Editor from "@monaco-editor/react";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Plus,
  Save,
  Trash2,
  X
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { PageHeader } from "../components/PageHeader";
import { useAppStore } from "../app/store";
import {
  createFileSystemEntry,
  deleteFileSystemEntry,
  fetchFile,
  renameFileSystemEntry,
  saveFile,
  type DirectoryEntry,
  type FileChangeEvent
} from "../lib/api";
import { cn } from "../lib/utils";

type FileState =
  | { status: "loading"; content?: string }
  | { status: "ready"; content: string }
  | { status: "error"; error: string }
  | { status: "unsupported"; error: string };

type TreeInputState =
  | { mode: "create-file" | "create-directory"; parentPath: string; depth: number }
  | { mode: "rename"; parentPath: string; targetPath: string; depth: number; originalName: string };

type ContextMenuState = {
  x: number;
  y: number;
  targetPath: string;
  targetName: string;
  targetIsDirectory: boolean;
  isRoot: boolean;
};

type DeleteTarget = {
  path: string;
  name: string;
  isDirectory: boolean;
};

const EDITOR_SIDEBAR_WIDTH_KEY = "zeroshot.editor.sidebar_width";
const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 640;

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
  return [entry.path, entry.relativePath, entry.name, entry.isDirectory ? "d" : "f"].join("|");
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

function baseName(path: string): string {
  if (!path) {
    return "(root)";
  }

  return path.split("/").filter(Boolean).at(-1) ?? path;
}

function parentRelativePath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) {
    return "";
  }
  return parts.slice(0, -1).join("/");
}

function pathDepth(path: string): number {
  return path ? path.split("/").filter(Boolean).length : 0;
}

function isWithinPath(root: string, target: string): boolean {
  if (!root) {
    return true;
  }
  return target === root || target.startsWith(`${root}/`);
}

function pruneDeletedPath(treeChildrenByPath: Record<string, DirectoryEntry[]>, deletedPath: string): Record<string, DirectoryEntry[]> {
  return Object.fromEntries(
    Object.entries(treeChildrenByPath)
      .filter(([path]) => !isWithinPath(deletedPath, path))
      .map(([path, entries]) => [path, entries.filter((entry) => !isWithinPath(deletedPath, entry.relativePath))])
  );
}

function renamePathPrefix(path: string, from: string, to: string): string {
  if (path === from) {
    return to;
  }
  if (!from || !path.startsWith(`${from}/`)) {
    return path;
  }
  return `${to}${path.slice(from.length)}`;
}

function renamePathArray(paths: string[], from: string, to: string): string[] {
  return paths.map((path) => renamePathPrefix(path, from, to));
}

function renamePathRecord<T>(record: Record<string, T>, from: string, to: string): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).map(([path, value]) => [renamePathPrefix(path, from, to), value])
  );
}

function removePathRecord<T>(record: Record<string, T>, deletedPath: string): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).filter(([path]) => !isWithinPath(deletedPath, path))
  );
}

function clampSidebarWidth(value: number): number {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, value));
}

function readInitialSidebarWidth(): number {
  if (typeof window === "undefined") {
    return DEFAULT_SIDEBAR_WIDTH;
  }

  const raw = window.localStorage.getItem(EDITOR_SIDEBAR_WIDTH_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clampSidebarWidth(parsed) : DEFAULT_SIDEBAR_WIDTH;
}

function TreeRow({
  entry,
  depth,
  expanded,
  selected,
  loading,
  onActivate,
  onToggle,
  onContextMenu,
  onCreateFile,
  onCreateDirectory
}: {
  entry: DirectoryEntry;
  depth: number;
  expanded: boolean;
  selected: boolean;
  loading: boolean;
  onActivate: () => void;
  onToggle: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onCreateFile?: () => void;
  onCreateDirectory?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "group grid w-full grid-cols-[28px_28px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-[var(--surface)]",
        selected && "bg-[var(--surface-active)]"
      )}
      style={{ paddingLeft: `${depth * 14 + 10}px` }}
      onClick={onActivate}
      onContextMenu={onContextMenu}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate();
        }
      }}
    >
      <div className="flex items-center justify-center">
        {entry.isDirectory ? (
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
        ) : (
          <span className="block size-4" />
        )}
      </div>
      <div className="flex items-center justify-center text-[var(--primary)]">
        {entry.isDirectory ? (
          expanded ? <FolderOpen className="size-4.5" /> : <Folder className="size-4.5" />
        ) : (
          <FileText className="size-4.5" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium">{entry.name}</p>
        {loading ? <p className="truncate text-[11px] text-[var(--muted-foreground)]">불러오는 중...</p> : null}
      </div>
      <div className="flex justify-end">
        {entry.isDirectory ? (
          <div className="hidden items-center gap-1 group-hover:flex group-focus-within:flex">
            <button
              type="button"
              className="rounded-md px-2 py-1 text-[11px] text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              onClick={(event) => {
                event.stopPropagation();
                onCreateFile?.();
              }}
            >
              파일
            </button>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-[11px] text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              onClick={(event) => {
                event.stopPropagation();
                onCreateDirectory?.();
              }}
            >
              폴더
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EditorPage() {
  const projectRoot = useAppStore((state) => state.projectRoot);
  const [expandedDirs, setExpandedDirs] = useState<string[]>([""]);
  const [treeChildrenByPath, setTreeChildrenByPath] = useState<Record<string, DirectoryEntry[]>>({});
  const [treeLoadingPaths, setTreeLoadingPaths] = useState<string[]>([]);
  const [treeErrorsByPath, setTreeErrorsByPath] = useState<Record<string, string>>({});
  const [selectedTreePath, setSelectedTreePath] = useState("");
  const [selectedTreeIsDirectory, setSelectedTreeIsDirectory] = useState(true);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeFilePath, setActiveFilePath] = useState("");
  const [draftsByPath, setDraftsByPath] = useState<Record<string, string>>({});
  const [fileStates, setFileStates] = useState<Record<string, FileState>>({});
  const [treeInput, setTreeInput] = useState<TreeInputState | null>(null);
  const [treeInputValue, setTreeInputValue] = useState("");
  const [treeInputError, setTreeInputError] = useState("");
  const [treeInputPending, setTreeInputPending] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [pendingDeleteTarget, setPendingDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [externalNoticesByPath, setExternalNoticesByPath] = useState<Record<string, string>>({});
  const [sidebarWidth, setSidebarWidth] = useState(readInitialSidebarWidth);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const expandedDirsRef = useRef(expandedDirs);
  const openTabsRef = useRef(openTabs);
  const activeFilePathRef = useRef(activeFilePath);
  const draftsByPathRef = useRef(draftsByPath);
  const fileStatesRef = useRef(fileStates);
  const selectedTreePathRef = useRef(selectedTreePath);
  const selectedTreeIsDirectoryRef = useRef(selectedTreeIsDirectory);

  const rootName = projectRoot.split("/").filter(Boolean).at(-1) ?? projectRoot;
  const rootEntries = treeChildrenByPath[""] ?? [];
  const activeFileState = activeFilePath ? fileStates[activeFilePath] : undefined;
  const currentContainerPath = selectedTreeIsDirectory ? selectedTreePath : parentRelativePath(selectedTreePath);

  expandedDirsRef.current = expandedDirs;
  openTabsRef.current = openTabs;
  activeFilePathRef.current = activeFilePath;
  draftsByPathRef.current = draftsByPath;
  fileStatesRef.current = fileStates;
  selectedTreePathRef.current = selectedTreePath;
  selectedTreeIsDirectoryRef.current = selectedTreeIsDirectory;

  async function loadDirectory(path: string, force = false) {
    if (!projectRoot) {
      return;
    }

    setTreeLoadingPaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setTreeErrorsByPath((prev) => {
      if (!(path in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[path];
      return next;
    });

    try {
      const result = await fetchFile(projectRoot, path);
      if (result.kind !== "directory") {
        throw new Error("디렉터리를 불러오지 못했습니다.");
      }

      setTreeChildrenByPath((prev) => {
        if (!force && entriesSignature(prev[path] ?? []) === entriesSignature(result.entries ?? [])) {
          return prev;
        }
        return mergeTreeChildren(prev, path, result.entries ?? []);
      });
    } catch (error) {
      setTreeErrorsByPath((prev) => ({
        ...prev,
        [path]: getErrorMessage(error, "디렉터리를 불러오지 못했습니다.")
      }));
    } finally {
      setTreeLoadingPaths((prev) => prev.filter((entry) => entry !== path));
    }
  }

  async function loadFilePath(path: string, force = false) {
    if (!projectRoot) {
      return;
    }

    const current = fileStatesRef.current[path];
    if (!force && (current?.status === "loading" || current?.status === "ready" || current?.status === "unsupported")) {
      return;
    }

    setFileStates((prev) => ({
      ...prev,
      [path]: {
        status: "loading",
        content: prev[path]?.status === "ready" ? prev[path].content : undefined
      }
    }));

    try {
      const result = await fetchFile(projectRoot, path);
      if (result.kind !== "file") {
        throw new Error("파일을 불러오지 못했습니다.");
      }

      const content = result.content ?? "";
      if (content.includes("\u0000")) {
        setFileStates((prev) => ({
          ...prev,
          [path]: { status: "unsupported", error: "바이너리 파일은 에디터에서 열 수 없습니다." }
        }));
        return;
      }

      setFileStates((prev) => ({
        ...prev,
        [path]: { status: "ready", content }
      }));
      setDraftsByPath((prev) => {
        if (force && path in prev) {
          return {
            ...prev,
            [path]: content
          };
        }

        return path in prev ? prev : { ...prev, [path]: content };
      });
      setExternalNoticesByPath((prev) => {
        if (!(path in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[path];
        return next;
      });
    } catch (error) {
      setFileStates((prev) => ({
        ...prev,
        [path]: { status: "error", error: getErrorMessage(error, "파일을 불러오지 못했습니다.") }
      }));
    }
  }

  function openFile(path: string) {
    setSelectedTreePath(path);
    setSelectedTreeIsDirectory(false);
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActiveFilePath(path);
    void loadFilePath(path);
  }

  function setSelectedDirectory(path: string) {
    setSelectedTreePath(path);
    setSelectedTreeIsDirectory(true);
  }

  function toggleDirectory(path: string) {
    setSelectedDirectory(path);
    const expanded = expandedDirsRef.current.includes(path);
    if (expanded) {
      setExpandedDirs((prev) => prev.filter((entry) => entry !== path));
      return;
    }

    setExpandedDirs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    if (!treeChildrenByPath[path]) {
      void loadDirectory(path);
    }
  }

  function closeTab(path: string) {
    setOpenTabs((prev) => {
      const index = prev.indexOf(path);
      if (index === -1) {
        return prev;
      }

      const nextTabs = prev.filter((entry) => entry !== path);
      if (activeFilePathRef.current === path) {
        const fallback = nextTabs[index] ?? nextTabs[index - 1] ?? "";
        setActiveFilePath(fallback);
        setSelectedTreePath(fallback);
        setSelectedTreeIsDirectory(false);
      }
      return nextTabs;
    });
  }

  function closeTabsWithin(path: string) {
    const remainingTabs = openTabsRef.current.filter((entry) => !isWithinPath(path, entry));
    if (remainingTabs.length !== openTabsRef.current.length) {
      setOpenTabs(remainingTabs);
      const activeDeleted = activeFilePathRef.current && isWithinPath(path, activeFilePathRef.current);
      if (activeDeleted) {
        const fallback = remainingTabs.at(-1) ?? "";
        setActiveFilePath(fallback);
        setSelectedTreePath(fallback);
        setSelectedTreeIsDirectory(false);
      }
    }

    setDraftsByPath((prev) => removePathRecord(prev, path));
    setFileStates((prev) => removePathRecord(prev, path));
    setExternalNoticesByPath((prev) => removePathRecord(prev, path));
  }

  function isDirty(path: string): boolean {
    const state = fileStates[path];
    if (!state || state.status !== "ready") {
      return false;
    }

    return (draftsByPath[path] ?? state.content) !== state.content;
  }

  function beginCreate(kind: "create-file" | "create-directory", parentPath: string) {
    setExpandedDirs((prev) => (prev.includes(parentPath) ? prev : [...prev, parentPath]));
    setSelectedDirectory(parentPath);
    setContextMenu(null);
    setTreeInput({
      mode: kind,
      parentPath,
      depth: parentPath === "" ? 0 : pathDepth(parentPath)
    });
    setTreeInputValue("");
    setTreeInputError("");
  }

  function beginRename(path: string, name: string) {
    setContextMenu(null);
    setTreeInput({
      mode: "rename",
      parentPath: parentRelativePath(path),
      targetPath: path,
      depth: pathDepth(path) - 1 >= 0 ? pathDepth(path) - 1 : 0,
      originalName: name
    });
    setTreeInputValue(name);
    setTreeInputError("");
  }

  async function submitTreeInput() {
    if (!projectRoot || !treeInput) {
      return;
    }

    setTreeInputPending(true);
    setTreeInputError("");

    try {
      if (treeInput.mode === "create-file" || treeInput.mode === "create-directory") {
        const created = await createFileSystemEntry({
          projectRoot,
          parentPath: treeInput.parentPath,
          name: treeInputValue,
          kind: treeInput.mode === "create-file" ? "file" : "directory"
        });

        await loadDirectory(treeInput.parentPath, true);
        setTreeInput(null);
        setTreeInputValue("");

        if (created.isDirectory) {
          setExpandedDirs((prev) => Array.from(new Set([...prev, treeInput.parentPath, created.relativePath])));
          setSelectedDirectory(created.relativePath);
          await loadDirectory(created.relativePath, true);
        } else {
          openFile(created.relativePath);
        }
        return;
      }

      if (treeInput.mode !== "rename") {
        throw new Error("이름 변경 대상이 없습니다.");
      }

      const renamed = await renameFileSystemEntry(projectRoot, treeInput.targetPath, treeInputValue);
      const oldPath = treeInput.targetPath;
      const parentPath = treeInput.parentPath;
      const wasDirectory = selectedTreeIsDirectoryRef.current && selectedTreePathRef.current === oldPath;
      const wasExpanded = expandedDirsRef.current.some((path) => isWithinPath(oldPath, path));

      setTreeChildrenByPath((prev) => pruneDeletedPath(prev, oldPath));
      setTreeErrorsByPath((prev) => removePathRecord(prev, oldPath));
      setExpandedDirs((prev) => {
        const next = prev.filter((path) => !isWithinPath(oldPath, path));
        if (wasExpanded && renamed.isDirectory) {
          return Array.from(new Set([...next, renamePathPrefix(oldPath, oldPath, renamed.relativePath)]));
        }
        return next;
      });
      setOpenTabs((prev) => renamePathArray(prev, oldPath, renamed.relativePath));
      setDraftsByPath((prev) => renamePathRecord(prev, oldPath, renamed.relativePath));
      setFileStates((prev) => renamePathRecord(prev, oldPath, renamed.relativePath));
      setExternalNoticesByPath((prev) => renamePathRecord(prev, oldPath, renamed.relativePath));
      setSelectedTreePath((prev) => renamePathPrefix(prev, oldPath, renamed.relativePath));
      setSelectedTreeIsDirectory(renamed.isDirectory || wasDirectory);
      setActiveFilePath((prev) => renamePathPrefix(prev, oldPath, renamed.relativePath));

      await loadDirectory(parentPath, true);
      if (renamed.isDirectory && wasExpanded) {
        setExpandedDirs((prev) => Array.from(new Set([...prev, renamed.relativePath])));
        await loadDirectory(renamed.relativePath, true);
      } else if (!renamed.isDirectory) {
        void loadFilePath(renamed.relativePath, true);
      }

      setTreeInput(null);
      setTreeInputValue("");
    } catch (error) {
      setTreeInputError(getErrorMessage(error, "처리하지 못했습니다."));
    } finally {
      setTreeInputPending(false);
    }
  }

  function beginDelete(path: string, name: string, isDirectory: boolean) {
    setContextMenu(null);
    setPendingDeleteTarget({ path, name, isDirectory });
    setDeleteConfirmationName("");
    setDeleteError("");
  }

  async function confirmDelete() {
    if (!projectRoot || !pendingDeleteTarget) {
      return;
    }

    setDeletePending(true);
    setDeleteError("");

    try {
      await deleteFileSystemEntry(projectRoot, pendingDeleteTarget.path);
      const parentPath = parentRelativePath(pendingDeleteTarget.path);
      closeTabsWithin(pendingDeleteTarget.path);
      setTreeChildrenByPath((prev) => pruneDeletedPath(prev, pendingDeleteTarget.path));
      setTreeErrorsByPath((prev) => removePathRecord(prev, pendingDeleteTarget.path));
      setExpandedDirs((prev) => prev.filter((path) => !isWithinPath(pendingDeleteTarget.path, path)));
      if (isWithinPath(pendingDeleteTarget.path, selectedTreePathRef.current)) {
        setSelectedDirectory(parentPath);
      }
      setPendingDeleteTarget(null);
      setDeleteConfirmationName("");
      await loadDirectory(parentPath, true);
    } catch (error) {
      setDeleteError(getErrorMessage(error, "삭제하지 못했습니다."));
    } finally {
      setDeletePending(false);
    }
  }

  function openContextMenu(event: React.MouseEvent, target: {
    path: string;
    name: string;
    isDirectory: boolean;
    isRoot?: boolean;
  }) {
    event.preventDefault();
    setSelectedTreePath(target.path);
    setSelectedTreeIsDirectory(target.isDirectory);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      targetPath: target.path,
      targetName: target.name,
      targetIsDirectory: target.isDirectory,
      isRoot: target.isRoot ?? false
    });
  }

  const saveMutation = useMutation({
    mutationFn: async (path: string) => saveFile(projectRoot, path, draftsByPath[path] ?? ""),
    onSuccess: (_data, path) => {
      const content = draftsByPath[path] ?? "";
      setFileStates((prev) => ({
        ...prev,
        [path]: { status: "ready", content }
      }));
      setExternalNoticesByPath((prev) => {
        if (!(path in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[path];
        return next;
      });
    }
  });

  useEffect(() => {
    if (!projectRoot) {
      return;
    }

    setExpandedDirs([""]);
    setTreeChildrenByPath({});
    setTreeLoadingPaths([]);
    setTreeErrorsByPath({});
    setSelectedTreePath("");
    setSelectedTreeIsDirectory(true);
    setOpenTabs([]);
    setActiveFilePath("");
    setDraftsByPath({});
    setFileStates({});
    setTreeInput(null);
    setTreeInputValue("");
    setTreeInputError("");
    setContextMenu(null);
    setPendingDeleteTarget(null);
    setDeleteConfirmationName("");
    setDeleteError("");
    setExternalNoticesByPath({});
    void loadDirectory("", true);
  }, [projectRoot]);

  useEffect(() => {
    if (!isResizingSidebar) {
      return;
    }

    const handleMove = (event: MouseEvent) => {
      if (!workspaceRef.current) {
        return;
      }

      const bounds = workspaceRef.current.getBoundingClientRect();
      setSidebarWidth(clampSidebarWidth(event.clientX - bounds.left));
    };

    const handleUp = () => {
      setIsResizingSidebar(false);
      window.localStorage.setItem(EDITOR_SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "col-resize";

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
    };
  }, [isResizingSidebar, sidebarWidth]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const handleClick = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!projectRoot) {
      return;
    }

    const stream = new EventSource(`/api/files/stream?projectRoot=${encodeURIComponent(projectRoot)}`);

    const handleChange = (rawEvent: Event) => {
      const event = rawEvent as MessageEvent<string>;
      const payload = JSON.parse(event.data) as FileChangeEvent;
      const dirsToReload = new Set<string>();
      dirsToReload.add(payload.parentPath || "");
      if (payload.path && expandedDirsRef.current.includes(payload.path)) {
        dirsToReload.add(payload.path);
      }

      dirsToReload.forEach((path) => {
        void loadDirectory(path, true);
      });

      if (!payload.path) {
        return;
      }

      if (payload.action === "changed") {
        const state = fileStatesRef.current[payload.path];
        const draft = draftsByPathRef.current[payload.path];

        if (state?.status === "ready" && draft !== undefined && draft !== state.content) {
          setExternalNoticesByPath((prev) => ({
            ...prev,
            [payload.path]: "파일이 외부에서 변경되었습니다. 저장하지 않은 내용이 있어 자동 갱신하지 않았습니다."
          }));
          return;
        }

        if (openTabsRef.current.includes(payload.path) || activeFilePathRef.current === payload.path) {
          void loadFilePath(payload.path, true);
        }
        return;
      }

      if (payload.action === "deleted") {
        closeTabsWithin(payload.path);
        if (isWithinPath(payload.path, selectedTreePathRef.current)) {
          setSelectedDirectory(payload.parentPath || "");
        }
      }
    };

    stream.addEventListener("change", handleChange as EventListener);

    return () => {
      stream.removeEventListener("change", handleChange as EventListener);
      stream.close();
    };
  }, [projectRoot]);

  const renderTree = (entries: DirectoryEntry[], parentPath: string, depth = 0): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];

    if (
      treeInput &&
      treeInput.mode !== "rename" &&
      treeInput.parentPath === parentPath
    ) {
      nodes.push(
        <div
          key={`input-create-${parentPath}`}
          className="space-y-2 px-2 py-1.5"
          style={{ paddingLeft: `${depth * 14 + 66}px` }}
        >
          <Input
            autoFocus
            value={treeInputValue}
            placeholder={treeInput.mode === "create-file" ? "새 파일 이름" : "새 폴더 이름"}
            onChange={(event) => {
              setTreeInputValue(event.target.value);
              setTreeInputError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setTreeInput(null);
                setTreeInputValue("");
                setTreeInputError("");
              }
              if (event.key === "Enter" && treeInputValue.trim()) {
                void submitTreeInput();
              }
            }}
          />
          {treeInputError ? <p className="text-xs text-[var(--danger-foreground)]">{treeInputError}</p> : null}
        </div>
      );
    }

    entries.forEach((entry) => {
      const isExpanded = entry.isDirectory && expandedDirs.includes(entry.relativePath);
      const children = treeChildrenByPath[entry.relativePath] ?? [];
      const loading = treeLoadingPaths.includes(entry.relativePath);

      if (treeInput?.mode === "rename" && treeInput.targetPath === entry.relativePath) {
        nodes.push(
          <div
            key={`input-rename-${entry.path}`}
            className="space-y-2 px-2 py-1.5"
            style={{ paddingLeft: `${depth * 14 + 66}px` }}
          >
            <Input
              autoFocus
              value={treeInputValue}
              placeholder={treeInput.originalName}
              onChange={(event) => {
                setTreeInputValue(event.target.value);
                setTreeInputError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setTreeInput(null);
                  setTreeInputValue("");
                  setTreeInputError("");
                }
                if (event.key === "Enter" && treeInputValue.trim()) {
                  void submitTreeInput();
                }
              }}
            />
            {treeInputError ? <p className="text-xs text-[var(--danger-foreground)]">{treeInputError}</p> : null}
          </div>
        );
        return;
      }

      nodes.push(
        <Fragment key={entry.path}>
          <TreeRow
            entry={entry}
            depth={depth}
            expanded={isExpanded}
            selected={selectedTreePath === entry.relativePath}
            loading={loading}
            onActivate={() => {
              if (entry.isDirectory) {
                setSelectedDirectory(entry.relativePath);
                return;
              }
              openFile(entry.relativePath);
            }}
            onToggle={() => {
              if (entry.isDirectory) {
                toggleDirectory(entry.relativePath);
              }
            }}
            onContextMenu={(event) => openContextMenu(event, {
              path: entry.relativePath,
              name: entry.name,
              isDirectory: entry.isDirectory
            })}
            onCreateFile={entry.isDirectory ? () => beginCreate("create-file", entry.relativePath) : undefined}
            onCreateDirectory={entry.isDirectory ? () => beginCreate("create-directory", entry.relativePath) : undefined}
          />
          {entry.isDirectory && isExpanded ? renderTree(children, entry.relativePath, depth + 1) : null}
          {entry.isDirectory && isExpanded && treeErrorsByPath[entry.relativePath] ? (
            <div
              key={`${entry.path}-error`}
              className="px-4 py-2 text-xs text-[var(--danger-foreground)]"
              style={{ paddingLeft: `${(depth + 1) * 14 + 42}px` }}
            >
              {treeErrorsByPath[entry.relativePath]}
            </div>
          ) : null}
        </Fragment>
      );
    });

    return nodes;
  };

  const contextMenuItems = useMemo(() => {
    if (!contextMenu) {
      return [];
    }

    const items: Array<{ label: string; action: () => void; danger?: boolean }> = [];

    if (contextMenu.isRoot || contextMenu.targetIsDirectory) {
      items.push({
        label: "새 파일",
        action: () => beginCreate("create-file", contextMenu.targetPath)
      });
      items.push({
        label: "새 폴더",
        action: () => beginCreate("create-directory", contextMenu.targetPath)
      });
    }

    if (!contextMenu.isRoot) {
      items.push({
        label: "이름 바꾸기",
        action: () => beginRename(contextMenu.targetPath, contextMenu.targetName)
      });
      items.push({
        label: "삭제",
        action: () => beginDelete(contextMenu.targetPath, contextMenu.targetName, contextMenu.targetIsDirectory),
        danger: true
      });
    }

    return items;
  }, [contextMenu]);

  if (!projectRoot) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="EDITOR" projectRoot={projectRoot} />
      <Card className="overflow-hidden p-0">
        <div ref={workspaceRef} className="flex min-h-[76vh] min-w-0">
          <aside
            className="flex min-w-0 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel)]"
            style={{ width: sidebarWidth }}
          >
            <div
              className="border-b border-[var(--border)] px-4 py-4"
              onClick={() => setSelectedDirectory("")}
              onContextMenu={(event) => openContextMenu(event, {
                path: "",
                name: rootName,
                isDirectory: true,
                isRoot: true
              })}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Workspace</p>
              <p className="mt-2 truncate text-base font-semibold">{rootName}</p>
              <p className="truncate text-sm text-[var(--muted-foreground)]">{projectRoot}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" className="h-8 px-3 py-1 text-xs" onClick={(event) => {
                  event.stopPropagation();
                  beginCreate("create-file", currentContainerPath);
                }}>
                  <Plus className="size-3.5" />
                  새 파일
                </Button>
                <Button variant="outline" className="h-8 px-3 py-1 text-xs" onClick={(event) => {
                  event.stopPropagation();
                  beginCreate("create-directory", currentContainerPath);
                }}>
                  <FolderPlus className="size-3.5" />
                  새 폴더
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              {treeLoadingPaths.includes("") && !rootEntries.length ? (
                <div className="px-2 py-4 text-sm text-[var(--muted-foreground)]">파일 트리를 불러오는 중...</div>
              ) : null}
              {treeErrorsByPath[""] ? (
                <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-surface)] px-3 py-4 text-sm text-[var(--danger-foreground)]">
                  {treeErrorsByPath[""]}
                </div>
              ) : null}
              {!treeLoadingPaths.includes("") && !treeErrorsByPath[""] && !rootEntries.length ? (
                <div className="px-2 py-4 text-sm text-[var(--muted-foreground)]">표시할 파일이 없습니다.</div>
              ) : null}
              <div className="space-y-1">{renderTree(rootEntries, "", 0)}</div>
            </div>
          </aside>

          <div
            className="flex w-3 shrink-0 cursor-col-resize items-center justify-center border-r border-[var(--border)] bg-[var(--surface)]/60"
            onMouseDown={() => setIsResizingSidebar(true)}
          >
            <GripVertical className="size-4 text-[var(--muted-foreground)]" />
          </div>

          <section className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-[var(--border)]">
              <div className="flex min-h-[52px] items-end gap-1 overflow-x-auto px-3 pt-3">
                {openTabs.map((path) => (
                  <div
                    key={path}
                    className={cn(
                      "flex min-w-[180px] max-w-[260px] items-center gap-2 rounded-t-xl border border-b-0 border-transparent px-3 py-2 text-sm",
                      activeFilePath === path
                        ? "border-[var(--border)] bg-[var(--card)]"
                        : "bg-[var(--surface)] text-[var(--muted-foreground)]"
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left"
                      onClick={() => {
                        setActiveFilePath(path);
                        setSelectedTreePath(path);
                        setSelectedTreeIsDirectory(false);
                        void loadFilePath(path);
                      }}
                    >
                      {baseName(path)}
                      {isDirty(path) ? " *" : ""}
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1 transition hover:bg-[var(--surface-hover)]"
                      onClick={() => closeTab(path)}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{activeFilePath || "파일을 열어 편집하세요"}</p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">
                    {activeFilePath ? projectRoot : "왼쪽 파일 트리에서 파일을 선택하세요."}
                  </p>
                </div>
                <Button
                  disabled={
                    !activeFilePath ||
                    activeFileState?.status !== "ready" ||
                    !isDirty(activeFilePath) ||
                    saveMutation.isPending
                  }
                  onClick={() => saveMutation.mutate(activeFilePath)}
                >
                  <Save className="size-4" />
                  저장
                </Button>
              </div>
              {activeFilePath && externalNoticesByPath[activeFilePath] ? (
                <div className="border-t border-[var(--warning-border)] bg-[var(--warning-surface)] px-4 py-3 text-sm text-[var(--warning-foreground)]">
                  {externalNoticesByPath[activeFilePath]}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 bg-[var(--panel)]">
              {!activeFilePath ? (
                <div className="flex h-full items-center justify-center p-10 text-sm text-[var(--muted-foreground)]">
                  왼쪽 파일 트리에서 파일을 선택하세요.
                </div>
              ) : activeFileState?.status === "loading" ? (
                <div className="flex h-full items-center justify-center p-10 text-sm text-[var(--muted-foreground)]">
                  파일을 불러오는 중...
                </div>
              ) : activeFileState?.status === "error" ? (
                <div className="flex h-full items-center justify-center p-10 text-sm text-[var(--danger-foreground)]">
                  {activeFileState.error}
                </div>
              ) : activeFileState?.status === "unsupported" ? (
                <div className="flex h-full items-center justify-center p-10 text-sm text-[var(--muted-foreground)]">
                  {activeFileState.error}
                </div>
              ) : activeFileState?.status === "ready" ? (
                <Editor
                  height="100%"
                  path={activeFilePath}
                  theme="one-dark-soft"
                  value={draftsByPath[activeFilePath] ?? activeFileState.content}
                  onChange={(value) => {
                    setDraftsByPath((prev) => ({
                      ...prev,
                      [activeFilePath]: value ?? ""
                    }));
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    smoothScrolling: true,
                    padding: { top: 16 }
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-10 text-sm text-[var(--muted-foreground)]">
                  파일을 선택하세요.
                </div>
              )}
            </div>

            {saveMutation.isError ? (
              <div className="border-t border-[var(--danger-border)] bg-[var(--danger-surface)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
                {getErrorMessage(saveMutation.error, "파일을 저장하지 못했습니다.")}
              </div>
            ) : null}
          </section>
        </div>
      </Card>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-[180px] rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {contextMenuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--surface)]",
                item.danger && "text-[var(--danger-foreground)]"
              )}
              onClick={() => {
                item.action();
                setContextMenu(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {pendingDeleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-6">
          <Card className="w-full max-w-xl space-y-4">
            <div>
              <p className="text-xl font-black tracking-tight">정말 삭제하시겠습니까?</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {pendingDeleteTarget.isDirectory ? "폴더와 그 안의 모든 내용" : "파일"}이 삭제됩니다.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-surface)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
              {pendingDeleteTarget.path || rootName}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-[var(--muted-foreground)]">삭제하려면 이름을 다시 입력하세요.</p>
              <Input
                autoFocus
                value={deleteConfirmationName}
                placeholder={pendingDeleteTarget.name}
                onChange={(event) => setDeleteConfirmationName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setPendingDeleteTarget(null);
                    setDeleteConfirmationName("");
                    setDeleteError("");
                  }
                  if (event.key === "Enter" && deleteConfirmationName === pendingDeleteTarget.name) {
                    void confirmDelete();
                  }
                }}
              />
              {deleteError ? <p className="text-xs text-[var(--danger-foreground)]">{deleteError}</p> : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPendingDeleteTarget(null);
                  setDeleteConfirmationName("");
                  setDeleteError("");
                }}
              >
                취소
              </Button>
              <Button
                className="bg-[var(--danger)] text-white hover:opacity-90"
                disabled={deleteConfirmationName !== pendingDeleteTarget.name || deletePending}
                onClick={() => {
                  void confirmDelete();
                }}
              >
                <Trash2 className="size-4" />
                삭제
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
