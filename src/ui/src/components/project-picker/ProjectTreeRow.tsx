import { Check, ChevronDown, ChevronRight, FolderPlus, FolderOpen, FolderTree } from "lucide-react";
import type { DirectoryEntry } from "@/types/api";
import { FloatingActionMenu, type FloatingActionMenuItem } from "@/components/ui/FloatingActionMenu";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { PathBadge } from "./PathBadge";
import { ProjectTreeMainButton } from "./ProjectTreeMainButton";

export function ProjectTreeRow({
  entry,
  depth,
  selected,
  current,
  expanded,
  childrenLoaded,
  loadError,
  onToggle,
  onOpen,
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
  onOpen: () => void;
  onCreateDirectory: () => void;
  onSelectProject: () => void;
  createPending: boolean;
  selectionPending: boolean;
}) {
  const actionItems: FloatingActionMenuItem[] = [
    {
      id: "open",
      label: entry.isDirectory ? "Open folder" : "Open file",
      icon: <FolderOpen className="size-4" />,
      onSelect: onOpen
    },
    ...(entry.isDirectory
      ? [
          {
            id: "new-folder",
            label: "New folder",
            icon: <FolderPlus className="size-4" />,
            disabled: !selected || createPending,
            onSelect: onCreateDirectory
          }
        ]
      : [])
  ];

  return (
    <div
      data-tree-entry-path={entry.path}
      className={cn(
        "grid w-full grid-cols-[32px_40px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-[var(--surface-hover)]",
        selected && "bg-[var(--surface-active)] text-[var(--background)] hover:bg-[var(--surface-active)]"
      )}
      style={{ paddingLeft: `${depth * 18 + 12}px` }}
    >
      <div className="flex items-center justify-center">
        {entry.isDirectory ? (
          <button
            type="button"
            className="rounded-md p-1 transition focus-visible:shadow-[var(--shadow-focus)]"
            aria-label={expanded ? `${entry.name} 접기` : `${entry.name} 펼치기`}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : null}
      </div>

      <ProjectTreeMainButton entry={entry} selected={selected} expanded={expanded} onOpen={onOpen} />

      <div className="flex flex-wrap items-center justify-end gap-2 pl-2">
        {!childrenLoaded && expanded && !loadError ? <PathBadge>Loading</PathBadge> : null}
        {loadError ? <PathBadge>{loadError}</PathBadge> : null}
        {current ? <PathBadge active>선택된 프로젝트</PathBadge> : null}
        {entry.hasWorkHistory ? <PathBadge active={!!entry.runsCount}>{entry.runsCount ? `UPDATE (${entry.runsCount})` : "History"}</PathBadge> : null}
        {entry.isDirectory && selected && !current ? (
          <Button className="h-8 px-3 py-1 text-xs" disabled={selectionPending} onClick={onSelectProject}>
            <FolderTree className="size-3.5" />
            프로젝트 선택
          </Button>
        ) : null}
        <FloatingActionMenu label={`${entry.name} actions`} items={actionItems} />
      </div>
    </div>
  );
}
