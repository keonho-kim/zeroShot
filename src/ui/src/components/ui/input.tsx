import * as React from "react";
import { cn } from "@/utils/cn";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-[1px] border-2 border-[var(--border)] bg-[var(--input)] px-2.5 py-1.5 font-mono text-xs font-bold text-[var(--foreground)] outline-none ring-0 transition focus-visible:shadow-[var(--shadow-focus)]",
        props.className
      )}
    />
  );
}
