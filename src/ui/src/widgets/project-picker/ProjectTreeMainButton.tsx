import { File, Folder, FolderOpen } from "lucide-react";
import type { DirectoryEntry } from "@/types/api";
import { cn } from "@/shared/lib/cn";

function ProjectTreeEntryContent({
  entry,
  selected,
  expanded
}: {
  entry: DirectoryEntry;
  selected: boolean;
  expanded: boolean;
}) {
  return (
    <>
      <div className="flex size-10 items-center justify-center rounded-md bg-[var(--muted)] text-[var(--primary)]">
        {entry.isDirectory ? selected || expanded ? <FolderOpen className="size-5" /> : <Folder className="size-5" /> : <File className="size-5" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{entry.name}</p>
        <p className={cn("truncate text-xs", selected ? "text-[var(--background)] opacity-80" : "text-[var(--muted-foreground)]")} title={entry.path}>
          {entry.path}
        </p>
      </div>
    </>
  );
}

export function ProjectTreeMainButton({
  entry,
  selected,
  expanded,
  onOpen
}: {
  entry: DirectoryEntry;
  selected: boolean;
  expanded: boolean;
  onOpen: () => void;
}) {
  const contentClassName = "col-span-2 grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-md text-left";

  if (!entry.isDirectory) {
    return (
      <div className={contentClassName}>
        <ProjectTreeEntryContent entry={entry} selected={selected} expanded={expanded} />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        contentClassName,
        "h-full w-full appearance-none border-0 bg-transparent p-0 outline-none transition focus-visible:shadow-[var(--shadow-focus)]",
        selected ? "text-[var(--background)]" : "text-[var(--foreground)]"
      )}
      aria-expanded={expanded}
      onClick={onOpen}
    >
      <ProjectTreeEntryContent entry={entry} selected={selected} expanded={expanded} />
    </button>
  );
}
