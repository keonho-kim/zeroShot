import { RefreshCcw } from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
import { Fragment, useRef, useState } from "react";
import type { DirectoryEntry } from "@/types/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { CreateDirectoryRow } from "./CreateDirectoryRow";
import { ProjectTreeRow } from "./ProjectTreeRow";
import { getErrorMessage } from "./project-picker-utils";

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
  const [treeDragging, setTreeDragging] = useState(false);
  const treeDragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
    dragged: boolean;
  } | null>(null);
  const suppressTreeClickRef = useRef(false);

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

  const renderTree = (treeEntries: DirectoryEntry[], depth = 0): ReactNode[] =>
    treeEntries.flatMap((entry) => {
      const expanded = expandedPaths.includes(entry.path);
      const children = childrenByPath[entry.path] ?? [];
      const loadError = loadErrors[entry.path] ?? "";
      const shouldRenderCreateRow = pendingCreateDir.parentPath === entry.path;

      return [
        <Fragment key={entry.path}>
          <ProjectTreeRow
            entry={entry}
            depth={depth}
            selected={selectedPath === entry.path}
            current={projectRoot === entry.path}
            expanded={expanded}
            childrenLoaded={Boolean(childrenByPath[entry.path]) || Boolean(loadError)}
            loadError={loadError}
            onToggle={() => {
              void onToggle(entry);
            }}
            onOpen={() => {
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
                다시 시도
              </Button>
            </div>
          ) : null}
          {entry.isDirectory && expanded ? renderTree(children, depth + 1) : null}
        </Fragment>
      ];
    });

  return (
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
        {renderTree(entries)}
        {pendingCreateDir.parentPath === currentPath ? renderCreateDirectoryRow(0) : null}
        {!entries.length && pendingCreateDir.parentPath !== currentPath ? (
          <div className="px-4 py-10 text-center text-sm text-[var(--muted-foreground)]">표시할 디렉터리가 없습니다.</div>
        ) : null}
        {createFailed ? (
          <div className="mx-3 my-3 rounded-md bg-[var(--danger-surface)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
            {getErrorMessage(createError, "새 폴더를 만들지 못했습니다. 이름 충돌 또는 잘못된 이름인지 확인하세요.")}
          </div>
        ) : null}
        {selectionFailed ? (
          <div className="mx-3 my-3 rounded-md bg-[var(--danger-surface)] px-4 py-3 text-sm text-[var(--danger-foreground)]">
            {getErrorMessage(selectionError, "프로젝트를 선택하지 못했습니다. 경로 권한을 확인하세요.")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
