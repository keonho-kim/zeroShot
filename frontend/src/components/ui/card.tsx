import * as React from "react";
import { cn } from "../../lib/utils";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-[var(--shadow-card)] backdrop-blur-md",
        props.className
      )}
    />
  );
}
