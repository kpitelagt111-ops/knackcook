import type { ReactNode } from "react";
import { cn } from "./cn";

export type SectionHeadingAlign = "left" | "center";
export type SectionHeadingLevel = "h1" | "h2" | "h3";

export interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  kicker?: ReactNode;
  align?: SectionHeadingAlign;
  level?: SectionHeadingLevel;
  className?: string;
  /** Optional trailing slot (e.g. a "view all" link). */
  trailing?: ReactNode;
}

const TITLE_SIZE: Record<SectionHeadingLevel, string> = {
  h1: "text-4xl sm:text-5xl lg:text-6xl",
  h2: "text-2xl sm:text-3xl lg:text-4xl",
  h3: "text-xl sm:text-2xl",
};

export function SectionHeading({
  eyebrow,
  title,
  kicker,
  align = "left",
  level = "h2",
  className,
  trailing,
}: SectionHeadingProps) {
  const Title = level;
  const isCenter = align === "center";

  return (
    <header
      className={cn(
        "flex flex-col gap-3",
        isCenter ? "items-center text-center" : "items-start",
        trailing && !isCenter ? "sm:flex-row sm:items-end sm:justify-between sm:gap-8" : null,
        className,
      )}
    >
      <div className={cn("flex flex-col gap-3", isCenter && "items-center")}>
        {eyebrow ? (
          <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
            <span className="rule-ember" />
            {eyebrow}
          </span>
        ) : null}
        <Title
          className={cn(
            "font-display font-medium tracking-tight text-foreground text-balance",
            TITLE_SIZE[level],
          )}
        >
          {title}
        </Title>
        {kicker ? (
          <p
            className={cn(
              "text-base sm:text-lg text-muted text-pretty",
              isCenter ? "max-w-2xl" : "max-w-2xl",
            )}
          >
            {kicker}
          </p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </header>
  );
}
