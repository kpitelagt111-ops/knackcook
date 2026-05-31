"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";
import { type Theme, useTheme } from "./theme-provider";

const ORDER: Theme[] = ["light", "dark", "system"];
const NEXT: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};
const LABEL: Record<Theme, string> = {
  light: "light",
  dark: "dark",
  system: "system",
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const active: Theme = mounted ? theme : "system";
  const next = NEXT[active];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${LABEL[active]}. Switch to ${LABEL[next]}.`}
      className={cn(
        "relative inline-flex size-10 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:border-ember-300 dark:hover:border-ember-500/70 hover:text-ember-600 dark:hover:text-ember-300",
        className,
      )}
    >
      <span className="sr-only">{`Theme: ${LABEL[active]}`}</span>
      <span aria-hidden className="theme-icon-stack relative block size-5">
        {ORDER.map((t) => (
          <span
            key={t}
            data-active={active === t}
            className="theme-icon absolute inset-0 inline-flex items-center justify-center"
          >
            {t === "light" ? <SunIcon /> : t === "dark" ? <MoonIcon /> : <SystemIcon />}
          </span>
        ))}
      </span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.93 19.07 1.41-1.41" />
      <path d="m17.66 6.34 1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M9 21h6" />
      <path d="M12 17v4" />
    </svg>
  );
}
