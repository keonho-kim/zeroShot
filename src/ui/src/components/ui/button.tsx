import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[1px] border-2 border-[var(--border)] px-4 py-2 font-mono text-xs font-black uppercase tracking-normal outline-none shadow-[var(--shadow-button)] transition duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]",
        outline: "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--arcade-cyan)]",
        ghost: "bg-[var(--panel)] text-[var(--foreground)] hover:bg-[var(--arcade-yellow)]",
        destructive: "bg-[var(--danger-surface)] text-[var(--danger-foreground)] hover:bg-[var(--danger-surface-strong)]"
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

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant, asChild = false, ...props }, ref) {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />;
});
