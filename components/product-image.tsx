import Image from "next/image";
import { cn } from "@/components/ui/cn";

const DEFAULT_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

/**
 * Product visual. Renders OUR editorial image when available, otherwise a
 * per-category placeholder. NEVER an Amazon-hosted image (compliance). REQ-P-04.
 *
 * Uses next/image (AVIF/WebP, lazy by default, CLS-safe via fill + sized
 * parent). Pass `priority` for above-the-fold images (product detail hero,
 * homepage hero thumbs) to boost LCP.
 */
export function ProductImage({
  path,
  alt,
  placeholderKey,
  className,
  sizes,
  priority,
}: {
  path?: string | null;
  alt?: string | null;
  placeholderKey?: string | null;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const wrapper = cn("relative aspect-square w-full overflow-hidden rounded-2xl", className);

  if (path) {
    return (
      <div className={wrapper}>
        <Image
          src={path}
          alt={alt ?? ""}
          fill
          sizes={sizes ?? DEFAULT_SIZES}
          className="object-cover"
          priority={priority}
        />
      </div>
    );
  }

  const label = placeholderKey ?? "kitchen";

  return (
    <div
      role="img"
      aria-label={`${label} placeholder`}
      className={cn(
        wrapper,
        "flex items-center justify-center bg-gradient-to-br from-cream-100 via-cream-50 to-ember-50",
        "dark:from-cocoa-700 dark:via-cocoa-800 dark:to-cocoa-700",
        "border border-border",
      )}
    >
      <span
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(232,122,60,0.18),transparent_55%)]"
      />
      <span
        aria-hidden
        className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(135deg,transparent_0_18px,rgba(74,58,44,0.04)_18px_19px)]"
      />
      <span className="relative flex flex-col items-center gap-1.5 text-cocoa-400 dark:text-cream-400">
        <PlaceholderGlyph />
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.2em]">
          {label.replace(/-/g, " ")}
        </span>
      </span>
    </div>
  );
}

function PlaceholderGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-10 w-10 opacity-70"
    >
      <path d="M14 32c0-6 4-10 10-10s10 4 10 10" />
      <path d="M10 38h28" />
      <path d="M24 10v8" />
      <path d="M19 14l5-4 5 4" />
    </svg>
  );
}
