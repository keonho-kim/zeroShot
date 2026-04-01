import * as React from "react";
import { cn } from "../../lib/utils";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("rounded-2xl border border-[var(--border)] bg-white/75 p-5 shadow-sm backdrop-blur", props.className)} />;
}
