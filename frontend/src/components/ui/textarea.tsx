import * as React from "react";
import { cn } from "../../lib/utils";

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-36 w-full rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus-visible:border-[var(--ring)] focus-visible:shadow-[var(--shadow-focus)]",
        props.className
      )}
    />
  );
}
