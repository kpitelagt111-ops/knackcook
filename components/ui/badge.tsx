import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type BadgeVariant =
  | "default"
  | "ember"
  | "outline"
  | "cream"
  | "success"
  | "danger"
  | "subtle";

export type BadgeSize = "sm" | "md";

const VARIANTS: Record<BadgeVariant, string> = {
  default: "bg-cocoa-700 text-cream-50 dark:bg-cocoa-800 dark:text-cream-100",
  ember: "bg-ember-100 text-ember-700 dark:bg-ember-900/40 dark:text-ember-200",
  outline: "border border-border-strong text-foreground",
  cream: "bg-cream-100 text-cocoa-700 dark:bg-cocoa-700 dark:text-cream-100",
  success: "bg-success-50 text-success-600 dark:bg-success-600/15 dark:text-success-50",
  danger: "bg-danger-50 text-danger-600 dark:bg-danger-600/15 dark:text-danger-50",
  subtle: "bg-surface-2 text-muted",
};

const SIZES: Record<BadgeSize, string> = {
  sm: "h-5 px-2 text-[0.6875rem] tracking-[0.08em]",
  md: "h-7 px-3 text-xs tracking-[0.06em]",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export function Badge({
  variant = "default",
  size = "sm",
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium uppercase",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
