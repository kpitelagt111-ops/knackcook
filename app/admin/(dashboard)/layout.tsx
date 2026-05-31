import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge, Button } from "@/components/ui";
import { requireUser } from "@/lib/auth/guards";
import { adminSignOutAction } from "../_components/admin-actions";
import { AdminMobileNav } from "../_components/admin-mobile-nav";
import { AdminNav, type AdminNavItem } from "../_components/admin-nav";

type NavItem = AdminNavItem & {
  superAdminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/products", label: "Products", icon: "products" },
  { href: "/admin/articles", label: "Blog", icon: "blog" },
  { href: "/admin/categories", label: "Categories", icon: "categories" },
  { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
  { href: "/admin/sync", label: "Sync", icon: "sync" },
  { href: "/admin/settings", label: "Settings", icon: "settings", superAdminOnly: true },
  { href: "/admin/users", label: "Users", icon: "users", superAdminOnly: true },
];

function initialsFor(input: string): string {
  const cleaned = input.trim();
  if (!cleaned) return "??";
  const parts = cleaned.split(/[\s.@_-]+/).filter(Boolean);
  if (parts.length === 0) return cleaned.slice(0, 2).toUpperCase();
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const visibleNav = NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin);
  const initials = initialsFor(user.name ?? user.email);
  const displayName = user.name ?? user.email.split("@")[0] ?? user.email;

  return (
    <div className="bg-paper-soft min-h-screen text-foreground">
      <AdminMobileNav
        items={visibleNav}
        displayName={displayName}
        email={user.email}
        role={user.role}
        initials={initials}
        isSuperAdmin={isSuperAdmin}
        signOutAction={adminSignOutAction}
      />
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
          <div className="border-b border-border px-5 py-6">
            <Link href="/admin" className="group flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember-500 font-display text-xl leading-none text-primary-foreground shadow-soft transition-transform duration-200 group-hover:-rotate-3"
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
          </div>

          <AdminNav items={visibleNav} />

          <div className="mt-auto border-t border-border px-4 py-4">
            <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cocoa-700 font-display text-sm font-medium leading-none text-cream-50 dark:bg-ember-700"
              >
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground" title={user.email}>
                  {displayName}
                </p>
                <div className="mt-1">
                  <Badge variant={isSuperAdmin ? "ember" : "subtle"} size="sm">
                    {user.role.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <form action={adminSignOutAction} className="flex-1">
                <Button type="submit" variant="outline" size="sm" className="w-full">
                  Sign out
                </Button>
              </form>
              <ThemeToggle />
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10 sm:py-12">{children}</div>
        </main>
      </div>
    </div>
  );
}
