import * as React from "react";
import { cn } from "@/utils/cn";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-[1px] border-[3px] border-[var(--border)] bg-[var(--input)] px-3 py-2 font-mono text-sm font-bold text-[var(--foreground)] outline-none transition focus-visible:shadow-[var(--shadow-focus)]",
        props.className
      )}
    />
  );
}
