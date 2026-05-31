import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "./cn";

export type InputSize = "sm" | "md" | "lg";

const SIZES: Record<InputSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  inputSize?: InputSize;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { inputSize = "md", invalid, className, type = "text", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        "block w-full rounded-xl border bg-surface text-foreground",
        "placeholder:text-subtle font-sans",
        "shadow-[inset_0_1px_2px_rgb(48_30_18_/_0.04)]",
        "transition-colors duration-150 outline-none",
        "focus-visible:border-ember-400 focus-visible:ring-2 focus-visible:ring-ember-400/30",
        invalid
          ? "border-danger-600 focus-visible:ring-danger-600/30"
          : "border-border-strong hover:border-ember-300 dark:hover:border-ember-500/70",
        SIZES[inputSize],
        className,
      )}
      {...rest}
    />
  );
});
