import * as React from "react";
import { cn } from "@/utils/cn";

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-36 w-full rounded-[2px] border-2 border-[var(--border)] bg-[var(--input)] px-3 py-2 font-mono text-sm text-[var(--foreground)] outline-none transition focus-visible:shadow-[var(--shadow-focus)]",
        props.className
      )}
    />
  );
}
