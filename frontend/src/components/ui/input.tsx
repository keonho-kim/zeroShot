import * as React from "react";
import { cn } from "../../lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-0 transition focus-visible:border-[var(--ring)] focus-visible:shadow-[var(--shadow-focus)]",
        props.className
      )}
    />
  );
}
