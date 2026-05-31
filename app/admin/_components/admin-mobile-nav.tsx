"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge, Button, cn } from "@/components/ui";
import type { AdminNavIcon, AdminNavItem } from "./admin-nav";

/**
 * Mobile-only admin chrome: a sticky top bar + slide-in drawer.
 *
 * Visible only at `< md` (the desktop sidebar in `(dashboard)/layout.tsx`
 * takes over from `md` and up). The drawer mirrors the desktop sidebar
 * content (logo, RBAC-filtered nav, user identity, sign-out, theme toggle)
 * and shares the same `bg-surface` / `border-border` / ember accent tokens.
 *
 * Accessibility:
 * - Backdrop has `aria-hidden`; the drawer panel is `role="dialog"`
 *   with `aria-modal="true"` and `aria-labelledby` pointing at the panel title.
 * - Focus is moved into the panel on open and restored to the toggle on close.
 * - `Escape` closes the drawer.
 * - Body scroll is locked while open.
 * - Nav links auto-close the drawer (so navigation feels native).
 */

const ICONS: Record<AdminNavIcon, React.ReactNode> = {
  dashboard: (
    <>
      <path d="M3 12.5 12 4l9 8.5" />
      <path d="M5 10v9h5v-6h4v6h5v-9" />
    </>
  ),
  products: (
    <>
      <path d="M4 8 12 4l8 4-8 4Z" />
      <path d="M4 8v8l8 4 8-4V8" />
      <path d="M12 12v8" />
    </>
  ),
  blog: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </>
  ),
  categories: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 15v-4" />
      <path d="M12 15V9" />
      <path d="M16 15v-7" />
    </>
  ),
  sync: (
    <>
      <path d="M4 12a8 8 0 0 1 14-5.3L20 9" />
      <path d="M20 4v5h-5" />
      <path d="M20 12a8 8 0 0 1-14 5.3L4 15" />
      <path d="M4 20v-5h5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.5 12a7.5 7.5 0 0 0-.2-1.7l2-1.5-2-3.4-2.3 1a7.5 7.5 0 0 0-2.9-1.7L13.5 2h-3l-.6 2.7a7.5 7.5 0 0 0-2.9 1.7l-2.3-1-2 3.4 2 1.5a7.5 7.5 0 0 0 0 3.4l-2 1.5 2 3.4 2.3-1a7.5 7.5 0 0 0 2.9 1.7L10.5 22h3l.6-2.7a7.5 7.5 0 0 0 2.9-1.7l2.3 1 2-3.4-2-1.5c.1-.6.2-1.1.2-1.7Z" />
    </>
  ),
  users: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-7 8-7s8 3 8 7" />
    </>
  ),
};

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type AdminMobileNavProps = {
  items: AdminNavItem[];
  displayName: string;
  email: string;
  role: string;
  initials: string;
  isSuperAdmin: boolean;
  /** Module-scope server action (`adminSignOutAction`). */
  signOutAction: () => Promise<void>;
};

export function AdminMobileNav({
  items,
  displayName,
  email,
  role,
  initials,
  isSuperAdmin,
  signOutAction,
}: AdminMobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  const close = useCallback(() => setOpen(false), []);

  // Esc closes; focus moves into the panel on open; restore focus on close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    // Move focus into the panel for screen-reader/keyboard users.
    const id = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 10);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
    };
  }, [open, close]);

  // Restore focus to the trigger when the drawer closes.
  useEffect(() => {
    if (open) return;
    triggerRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Body scroll lock while drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Top bar — visible below md only. */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:hidden">
        <Link href="/admin" className="group flex items-center gap-2.5" onClick={close}>
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-ember-500 font-display text-lg leading-none text-primary-foreground shadow-soft"
          >
            K
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-medium tracking-tight text-foreground">
              KnackCook
            </span>
            <span className="text-[0.58rem] font-medium uppercase tracking-[0.22em] text-ember-600">
              Editorial · Admin
            </span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button
            ref={triggerRef}
            type="button"
            aria-label="Open admin menu"
            aria-expanded={open}
            aria-controls={titleId}
            onClick={() => setOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-full bg-ember-500 text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:bg-ember-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Backdrop + sliding panel. Rendered conditionally so it's invisible
          to assistive tech when closed. */}
      {open ? (
        <div className="md:hidden">
          <button
            type="button"
            aria-label="Close admin menu"
            onClick={close}
            className="fixed inset-0 z-50 cursor-default bg-foreground/45 backdrop-blur-[2px] animate-in fade-in"
          />
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed inset-y-0 left-0 z-[60] flex w-[88%] max-w-sm flex-col border-r border-border bg-surface shadow-2xl outline-none"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <Link
                href="/admin"
                onClick={close}
                id={titleId}
                className="group flex items-center gap-3"
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember-500 font-display text-xl leading-none text-primary-foreground shadow-soft"
                >
                  K
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="font-display text-lg font-medium tracking-tight text-foreground">
                    KnackCook
                  </span>
                  <span className="text-[0.62rem] font-medium uppercase tracking-[0.22em] text-ember-600">
                    Editorial · Admin
                  </span>
                </span>
              </Link>
              <button
                type="button"
                aria-label="Close admin menu"
                onClick={close}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-ember-300 dark:hover:border-ember-500/70 hover:text-ember-600 dark:hover:text-ember-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="m6 6 12 12" />
                  <path d="M18 6 6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Admin mobile">
              {items.map((item) => {
                const active = isItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                      "transition-colors duration-150",
                      active
                        ? "bg-ember-500 text-primary-foreground shadow-soft"
                        : "text-muted hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className={cn(
                        "shrink-0",
                        active
                          ? "text-primary-foreground"
                          : "text-subtle group-hover:text-ember-500",
                      )}
                    >
                      {ICONS[item.icon]}
                    </svg>
                    <span className="flex-1 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border px-4 py-4">
              <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cocoa-700 font-display text-sm font-medium leading-none text-cream-50 dark:bg-ember-700"
                >
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground" title={email}>
                    {displayName}
                  </p>
                  <div className="mt-1">
                    <Badge variant={isSuperAdmin ? "ember" : "subtle"} size="sm">
                      {role.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <form action={signOutAction} className="flex-1">
                  <Button type="submit" variant="outline" size="sm" className="w-full">
                    Sign out
                  </Button>
                </form>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
