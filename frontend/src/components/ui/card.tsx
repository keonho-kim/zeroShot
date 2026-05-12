import * as React from "react";
import { cn } from "../../lib/utils";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-[2px] border-2 border-[var(--border)] bg-[var(--card)] p-5 text-[var(--card-foreground)]",
        props.className
      )}
    />
  );
}
