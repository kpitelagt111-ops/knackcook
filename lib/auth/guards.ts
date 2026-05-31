import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type AdminRole = "SUPER_ADMIN" | "EDITOR";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    role: session.user.role,
  };
}

export async function requireUser(callbackUrl?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = callbackUrl
      ? `/admin/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/admin/login";
    redirect(target);
  }
  return user;
}

export async function requireRole(role: AdminRole, callbackUrl?: string): Promise<CurrentUser> {
  const user = await requireUser(callbackUrl);
  if (user.role === "SUPER_ADMIN") return user;
  if (user.role === role) return user;
  redirect("/admin?error=forbidden");
}
