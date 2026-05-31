import { cn } from "./cn";

export type RatingSize = "sm" | "md" | "lg";

export interface RatingProps {
  /** Editorial score on a 0-10 scale. */
  score: number;
  size?: RatingSize;
  /** Show the "editorial" sub-label. Defaults to false. */
  showLabel?: boolean;
  /** Render as a flat inline element instead of a filled chip. */
  flat?: boolean;
  className?: string;
}

const SIZE_CHIP: Record<RatingSize, string> = {
  sm: "h-7 gap-1.5 px-2.5 text-xs",
  md: "h-9 gap-2 px-3 text-sm",
  lg: "h-12 gap-2.5 px-4 text-base",
};
const SIZE_ICON: Record<RatingSize, string> = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

function tone(score: number, flat: boolean): string {
  if (flat) {
    return "text-ember-700 dark:text-ember-300";
  }
  if (score >= 9) {
    return "bg-ember-500 text-primary-foreground";
  }
  if (score >= 7.5) {
    return "bg-ember-100 text-ember-800 dark:bg-ember-900/40 dark:text-ember-200";
  }
  if (score >= 6) {
    return "bg-cream-200 text-cocoa-700 dark:bg-cocoa-700 dark:text-cream-200";
  }
  return "bg-surface-2 text-muted";
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className} fill="currentColor">
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77 4.8 17.5l.99-5.78L1.58 7.62l5.82-.85L10 1.5z" />
    </svg>
  );
}

/**
 * KnackCook editorial rating chip. Renders our own /10 verdict only
 * (NEVER Amazon stars — REQ-P-02).
 */
export function Rating({
  score,
  size = "md",
  showLabel = false,
  flat = false,
  className,
}: RatingProps) {
  const formatted = Number.isInteger(score) ? `${score}.0` : score.toFixed(1);
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold tabular-nums",
        flat
          ? cn("gap-1.5 px-0", size === "lg" ? "text-base" : "text-sm")
          : cn("rounded-full", SIZE_CHIP[size]),
        tone(score, flat),
        className,
      )}
      title={`Editorial rating: ${formatted}/10`}
    >
      <StarIcon className={SIZE_ICON[size]} />
      <span>{formatted}</span>
      <span className="font-normal opacity-80">/10</span>
      {showLabel ? (
        <span className="ml-1 hidden font-normal uppercase tracking-[0.14em] text-[0.65em] opacity-70 sm:inline">
          editorial
        </span>
      ) : null}
    </span>
  );
}
