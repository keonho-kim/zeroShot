import * as React from "react";
import { cn } from "@/utils/cn";

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-28 w-full rounded-[2px] border-2 border-[var(--border)] bg-[var(--input)] px-2.5 py-1.5 font-mono text-xs text-[var(--foreground)] outline-none transition focus-visible:shadow-[var(--shadow-focus)]",
        props.className
      )}
    />
  );
}
