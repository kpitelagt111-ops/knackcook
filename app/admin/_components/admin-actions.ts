"use server";

import { signOut } from "@/auth";

/**
 * Module-scope server action so both the desktop sidebar (in
 * `app/admin/(dashboard)/layout.tsx`) and the mobile drawer
 * (`admin-mobile-nav.tsx`, a client component) can wire the same
 * `<form action={...}>` without each render producing a fresh closure.
 */
export async function adminSignOutAction(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
