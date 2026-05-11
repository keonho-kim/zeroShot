import * as React from "react";
import { cn } from "../../lib/utils";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-lg bg-[var(--card)] p-5 text-[var(--card-foreground)]",
        props.className
      )}
    />
  );
}
