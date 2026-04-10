import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2 text-sm font-medium outline-none transition duration-150 focus-visible:border-[var(--ring)] focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-card)] hover:-translate-y-px hover:brightness-105 active:translate-y-0",
        outline: "border-[var(--border)] bg-[var(--panel)] text-[var(--foreground)] shadow-[var(--shadow-card)] hover:border-[var(--surface-active)] hover:bg-[var(--surface-hover)]",
        ghost: "text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
        destructive: "border-[var(--danger-border)] bg-[var(--danger-surface)] text-[var(--danger-foreground)] hover:border-[var(--danger)] hover:bg-[var(--danger-surface-strong)]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant }), className)} {...props} />;
}
