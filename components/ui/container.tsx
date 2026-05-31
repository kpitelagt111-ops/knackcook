import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type ContainerSize = "sm" | "md" | "lg" | "xl" | "full";

const SIZE_CLASS: Record<ContainerSize, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
}

/** Centered, horizontally padded content well. */
export function Container({ size = "md", className, children, ...rest }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-5 sm:px-8", SIZE_CLASS[size], className)} {...rest}>
      {children}
    </div>
  );
}
