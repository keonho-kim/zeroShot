import { RefreshCcw } from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import type { DirectoryEntry } from "@/types/api";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/utils/cn";
import { CreateDirectoryRow } from "./CreateDirectoryRow";
import { ProjectTreeRow } from "./ProjectTreeRow";
import { getErrorMessage, prioritizeSelectedDirectory } from "./project-picker-utils";

function smoothEaseInOut(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function scrollDuration(distance: number): number {
  return Math.min(820, Math.max(420, 520 + Math.abs(distance) * 0.35));
}

export function ProjectTree({
  projectRoot,
  currentPath,
  entries,
  selectedPath,
  expandedPaths,
  childrenByPath,
  loadErrors,
  pendingCreateDir,
  createPending,
  createError,
  createFailed,
  selectionPending,
  selectionError,
  selectionFailed,
  onPendingCreateNameChange,
  onSubmitCreate,
  onCancelCreate,
  onToggle,
  onSelectAndExpand,
  onStartCreate,
  onSelectProject,
  onLoadChildren
}: {
  projectRoot: string;
  currentPath: string;
  entries: DirectoryEntry[];
  selectedPath: string;
  expandedPaths: string[];
  childrenByPath: Record<string, DirectoryEntry[]>;
  loadErrors: Record<string, string>;
  pendingCreateDir: { parentPath: string; name: string };
  createPending: boolean;
  createError: unknown;
  createFailed: boolean;
  selectionPending: boolean;
  selectionError: unknown;
  selectionFailed: boolean;
  onPendingCreateNameChange: (name: string) => void;
  onSubmitCreate: () => void;
  onCancelCreate: () => void;
  onToggle: (entry: DirectoryEntry) => void | Promise<void>;
  onSelectAndExpand: (entry: DirectoryEntry) => void | Promise<void>;
  onStartCreate: (parentPath: string) => void;
  onSelectProject: (path: string) => void;
  onLoadChildren: (path: string) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [treeDragging, setTreeDragging] = useState(false);
  const [focusedEntryPath, setFocusedEntryPath] = useState("");
  const treeScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const scrollStartTopRef = useRef<number | null>(null);
  const treeDragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
    dragged: boolean;
  } | null>(null);
  const suppressTreeClickRef = useRef(false);

  const focusEntry = (path: string) => {
    scrollStartTopRef.current = treeScrollRef.current?.scrollTop ?? null;
    setFocusedEntryPath(path);
  };

  const stopScrollAnimation = () => {
    if (scrollAnimationRef.current !== null) {
      window.cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }
  };

  const animateTreeScroll = (container: HTMLDivElement, targetTop: number) => {
    stopScrollAnimation();

    const startTop = container.scrollTop;
    const distance = targetTop - startTop;
    if (Math.abs(distance) < 2) {
      container.scrollTop = targetTop;
      return;
    }

    const duration = scrollDuration(distance);
    const startTime = performance.now();

    const tick = (time: number) => {
      const progress = Math.min(1, (time - startTime) / duration);
      container.scrollTop = startTop + distance * smoothEaseInOut(progress);

      if (progress < 1) {
        scrollAnimationRef.current = window.requestAnimationFrame(tick);
        return;
      }

      container.scrollTop = targetTop;
      scrollAnimationRef.current = null;
    };

    scrollAnimationRef.current = window.requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!focusedEntryPath || treeDragging) {
      return;
    }

    const container = treeScrollRef.current;
    const row = Array.from(container?.querySelectorAll<HTMLElement>("[data-tree-entry-path]") ?? [])
      .find((element) => element.dataset.treeEntryPath === focusedEntryPath);
    if (!container || !row) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const startTop = scrollStartTopRef.current;
    if (startTop !== null) {
      container.scrollTop = startTop;
      scrollStartTopRef.current = null;
    }
    animateTreeScroll(container, Math.max(container.scrollTop + rowRect.top - containerRect.top - 8, 0));
    return stopScrollAnimation;
  }, [focusedEntryPath, treeDragging]);

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

  const renderCreateDirectoryRow = (depth: number) => (
    <CreateDirectoryRow
      depth={depth}
      name={pendingCreateDir.name}
      pending={createPending}
      onNameChange={onPendingCreateNameChange}
      onSubmit={onSubmitCreate}
      onCancel={onCancelCreate}
    />
  );

  const renderEmptyDirectoryPrompt = (path: string, depth: number) => (
    <div
      className="flex flex-wrap items-center gap-3 px-3 py-3 text-sm text-[var(--muted-foreground)]"
      style={{ paddingLeft: `${depth * 18 + 12}px` }}
    >
      <span>{t("projectPicker.emptyFolder")}</span>
      <Button variant="outline" className="h-8 px-3 py-1 text-xs" onClick={() => onStartCreate(path)}>
        {t("projectPicker.newFolder")}
      </Button>
    </div>
  );

  const renderTree = (treeEntries: DirectoryEntry[], depth = 0): ReactNode[] => {
    const orderedEntries = depth === 0
      ? prioritizeSelectedDirectory(treeEntries, focusedEntryPath || selectedPath)
      : treeEntries;

    return orderedEntries.flatMap((entry) => {
      const expanded = expandedPaths.includes(entry.path);
      const children = childrenByPath[entry.path] ?? [];
      const loadError = loadErrors[entry.path] ?? "";
      const childrenLoaded = Object.hasOwn(childrenByPath, entry.path) || Boolean(loadError);
      const shouldRenderCreateRow = pendingCreateDir.parentPath === entry.path;
      const shouldRenderEmptyPrompt = entry.isDirectory && expanded && childrenLoaded && !loadError && !children.length && !shouldRenderCreateRow;

      return [
        <Fragment key={entry.path}>
          <ProjectTreeRow
            entry={entry}
            depth={depth}
            selected={selectedPath === entry.path}
            current={projectRoot === entry.path}
            expanded={expanded}
            childrenLoaded={childrenLoaded}
            loadError={loadError}
            onToggle={() => {
              if (depth === 0) {
                focusEntry(entry.path);
              }
              void onToggle(entry);
            }}
            onOpen={() => {
              if (depth === 0) {
                focusEntry(entry.path);
              }
              void onSelectAndExpand(entry);
            }}
            onCreateDirectory={() => onStartCreate(entry.path)}
            onSelectProject={() => onSelectProject(entry.path)}
            createPending={createPending}
            selectionPending={selectionPending}
          />
          {shouldRenderCreateRow ? renderCreateDirectoryRow(depth + 1) : null}
          {expanded && loadError ? (
            <div
              className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--danger-foreground)]"
              style={{ paddingLeft: `${(depth + 1) * 18 + 12}px` }}
            >
              <span className="min-w-0 flex-1 truncate">{loadError}</span>
              <Button variant="outline" className="h-8 px-3 py-1 text-xs" onClick={() => void onLoadChildren(entry.path)}>
                <RefreshCcw className="size-3.5" />
                {t("common.retry")}
              </Button>
            </div>
          ) : null}
          {entry.isDirectory && expanded ? renderTree(children, depth + 1) : null}
          {shouldRenderEmptyPrompt ? renderEmptyDirectoryPrompt(entry.path, depth + 1) : null}
        </Fragment>
      ];
    });
  };

  return (
    <div
      ref={treeScrollRef}
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
        {renderTree(entries)}
        {pendingCreateDir.parentPath === currentPath ? renderCreateDirectoryRow(0) : null}
        {!entries.length && pendingCreateDir.parentPath !== currentPath ? renderEmptyDirectoryPrompt(currentPath, 0) : null}
        {createFailed ? (
          <div className="mx-3 my-3 rounded-md bg-[var(--danger-surface)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
            {getErrorMessage(createError, t("projectPicker.createError"))}
          </div>
        ) : null}
        {selectionFailed ? (
          <div className="mx-3 my-3 rounded-md bg-[var(--danger-surface)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
            {getErrorMessage(selectionError, t("projectPicker.selectionError"))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
