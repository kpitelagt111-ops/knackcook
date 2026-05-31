"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";

const KEY = "kk:wishlist";
const EVENT = "kk:wishlist-change";

function readWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function writeWishlist(next: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* localStorage unavailable */
  }
}

type Props = {
  slug: string;
  variant?: "compact" | "full";
  className?: string;
};

export function WishlistButton({ slug, variant = "compact", className }: Props) {
  const t = useTranslations("common");
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sync = () => setActive(readWishlist().includes(slug));
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT, sync);
    };
  }, [slug]);

  const toggle = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const current = readWishlist();
      const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
      writeWishlist(next);
      setActive(next.includes(slug));
    },
    [slug],
  );

  const label = mounted && active ? t("removeFromWishlist") : t("addToWishlist");

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={mounted ? active : undefined}
        aria-label={label}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-ember-400 focus-visible:outline-offset-2",
          mounted && active
            ? "border-ember-300 bg-ember-50 text-ember-700 hover:border-ember-400 hover:bg-ember-100 dark:border-ember-700/60 dark:bg-ember-900/30 dark:text-ember-200 dark:hover:bg-ember-900/50"
            : "border-border-strong bg-surface text-foreground hover:border-ember-300 dark:hover:border-ember-500/70 hover:bg-surface-2",
          className,
        )}
      >
        <HeartIcon filled={mounted && active} className="size-4" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={mounted ? active : undefined}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full border shadow-soft backdrop-blur transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ember-400 focus-visible:outline-offset-2",
        mounted && active
          ? "border-ember-300 bg-ember-500 text-primary-foreground hover:bg-ember-600 hover:border-ember-400 dark:border-ember-300/70"
          : "border-border bg-surface/90 text-foreground hover:border-ember-300 hover:text-ember-600 dark:hover:border-ember-500/70 dark:hover:text-ember-300",
        className,
      )}
    >
      <HeartIcon filled={mounted && active} className="size-4" />
    </button>
  );
}

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 16.5s-6-3.6-6-8a3.5 3.5 0 0 1 6-2.5A3.5 3.5 0 0 1 16 8.5c0 4.4-6 8-6 8z" />
    </svg>
  );
}
