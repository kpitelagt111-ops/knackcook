"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/components/ui";

/**
 * Client-side sidebar nav with active-state highlighting.
 *
 * Icons are inline SVG strokes so we don't pull a new dependency. The active
 * test treats `/admin` as exact-match (so it doesn't light up on every nested
 * route) and any other entry as prefix-match (so `/admin/products/:id` keeps
 * "Products" highlighted).
 */

export type AdminNavIcon =
  | "dashboard"
  | "products"
  | "blog"
  | "categories"
  | "analytics"
  | "sync"
  | "settings"
  | "users";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: AdminNavIcon;
};

const ICONS: Record<AdminNavIcon, ReactNode> = {
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

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Admin">
      {items.map((item) => {
        const active = isItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
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
                active ? "text-primary-foreground" : "text-subtle group-hover:text-ember-500",
              )}
            >
              {ICONS[item.icon]}
            </svg>
            <span className="flex-1 truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
