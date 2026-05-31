import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type CardVariant = "default" | "muted" | "outline" | "ember";

const VARIANTS: Record<CardVariant, string> = {
  default: "bg-surface border border-border shadow-soft",
  muted: "bg-surface-2 border border-border",
  outline: "bg-transparent border border-border-strong",
  ember:
    "bg-ember-50 border border-ember-100 text-ember-900 shadow-[0_1px_2px_rgb(216_90_29_/_0.05),0_12px_32px_-16px_rgb(216_90_29_/_0.20)] dark:bg-ember-900/30 dark:border-ember-700/60 dark:text-ember-100",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ variant = "default", className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn("rounded-2xl", VARIANTS[variant], "transition-shadow duration-300", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 pt-6 pb-4 border-b border-border", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-4 border-t border-border", className)} {...rest}>
      {children}
    </div>
  );
}
