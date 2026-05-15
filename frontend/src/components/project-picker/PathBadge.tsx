import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export function PathBadge({ active, children }: { active?: boolean; children: ReactNode }) {
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
