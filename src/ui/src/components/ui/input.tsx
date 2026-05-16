import * as React from "react";
import { cn } from "@/utils/cn";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-[1px] border-[3px] border-[var(--border)] bg-[var(--input)] px-3 py-2 font-mono text-sm font-bold text-[var(--foreground)] outline-none ring-0 transition focus-visible:shadow-[var(--shadow-focus)]",
        props.className
      )}
    />
  );
}
