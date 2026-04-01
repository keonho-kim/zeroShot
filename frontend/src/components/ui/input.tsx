import * as React from "react";
import { cn } from "../../lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-[var(--primary)]", props.className)} />;
}
