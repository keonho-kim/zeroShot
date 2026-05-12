import * as React from "react";
import { cn } from "../../lib/utils";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-[2px] border-2 border-[var(--border)] bg-[var(--input)] px-3 py-2 font-mono text-sm text-[var(--foreground)] outline-none transition focus-visible:shadow-[var(--shadow-focus)]",
        props.className
      )}
    />
  );
}
