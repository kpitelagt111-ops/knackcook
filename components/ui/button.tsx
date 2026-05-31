import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "link";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonShape = "pill" | "rounded";

export interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  className?: string;
}

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap " +
  "transition-all duration-200 ease-out outline-none " +
  "focus-visible:outline-2 focus-visible:outline-ember-400 focus-visible:outline-offset-2 " +
  "disabled:opacity-50 disabled:pointer-events-none select-none";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-ember-600 text-primary-foreground shadow-soft hover:bg-ember-700 hover:shadow-lift active:translate-y-px dark:bg-ember-400 dark:hover:bg-ember-300",
  secondary: "bg-cocoa-700 text-cream-50 shadow-soft hover:bg-cocoa-600 active:translate-y-px",
  outline:
    "border border-border-strong bg-surface text-foreground hover:bg-surface-2 hover:border-ember-400",
  ghost: "text-foreground hover:bg-surface-2",
  link: "text-ember-600 dark:text-ember-300 underline-offset-4 hover:underline hover:text-ember-700 dark:hover:text-ember-200",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

const SHAPES: Record<ButtonShape, string> = {
  pill: "rounded-full",
  rounded: "rounded-xl",
};

/** Returns the className for a button-styled element. Use on <a>, Link, or <button>. */
export function buttonStyles({
  variant = "primary",
  size = "md",
  shape = "rounded",
  className,
}: ButtonStyleProps = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], SHAPES[shape], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, shape, className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonStyles({ variant, size, shape, className })}
      {...rest}
    />
  );
});
