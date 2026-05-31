"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/auth/audit";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";

/**
 * Admin user management actions.
 *
 * All actions are gated by `requireRole("SUPER_ADMIN")` and recorded in the
 * `AuditLog`. A safety net prevents the last `SUPER_ADMIN` from being demoted
 * or deleted — otherwise the site would have no one able to manage settings.
 * Form-bound entry points return `Promise<void>` to satisfy React's
 * `<form action>` contract; validation failures are logged server-side.
 */

const ROLES = ["SUPER_ADMIN", "EDITOR"] as const;
const roleSchema = z.enum(ROLES);

const createUserSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().trim().min(1).max(120).optional(),
  password: z.string().min(8).max(200),
  role: roleSchema,
});

const idSchema = z.string().min(1);

const changeRoleSchema = z.object({
  id: idSchema,
  role: roleSchema,
});

const BCRYPT_ROUNDS = 12;

async function countSuperAdmins(): Promise<number> {
  return db.user.count({ where: { role: "SUPER_ADMIN" } });
}

export async function createAdminUser(formData: FormData): Promise<void> {
  const actor = await requireRole("SUPER_ADMIN");

  const parsed = createUserSchema.safeParse({
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    name: ((formData.get("name") as string | null) ?? "").trim() || undefined,
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? ""),
  });
  if (!parsed.success) {
    console.error("[users] create rejected:", parsed.error.issues);
    return;
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) {
    console.error(`[users] create rejected: ${parsed.data.email} already exists`);
    return;
  }

  const password = await hash(parsed.data.password, BCRYPT_ROUNDS);
  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name ?? null,
      password,
      role: parsed.data.role,
    },
    select: { id: true, email: true, role: true },
  });

  await logAudit({
    userId: actor.id,
    action: "user.create",
    entity: "User",
    entityId: user.id,
    meta: { email: user.email, role: user.role },
  });

  revalidatePath("/admin/users");
}

export async function deleteAdminUser(formData: FormData): Promise<void> {
  const actor = await requireRole("SUPER_ADMIN");

  const parsedId = idSchema.safeParse(formData.get("id"));
  if (!parsedId.success) {
    console.error("[users] delete rejected: missing id");
    return;
  }
  const id = parsedId.data;

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });
  if (!target) {
    console.error(`[users] delete rejected: user ${id} not found`);
    return;
  }

  if (target.role === "SUPER_ADMIN") {
    const count = await countSuperAdmins();
    if (count <= 1) {
      console.error("[users] delete rejected: cannot remove last SUPER_ADMIN");
      return;
    }
  }

  await db.user.delete({ where: { id } });
  await logAudit({
    userId: actor.id,
    action: "user.delete",
    entity: "User",
    entityId: id,
    meta: { email: target.email, role: target.role },
  });

  revalidatePath("/admin/users");
}

export async function changeAdminUserRole(formData: FormData): Promise<void> {
  const actor = await requireRole("SUPER_ADMIN");

  const parsed = changeRoleSchema.safeParse({
    id: formData.get("id"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    console.error("[users] role change rejected:", parsed.error.issues);
    return;
  }

  const target = await db.user.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, email: true, role: true },
  });
  if (!target) {
    console.error(`[users] role change rejected: user ${parsed.data.id} not found`);
    return;
  }

  if (target.role === parsed.data.role) return;

  if (target.role === "SUPER_ADMIN" && parsed.data.role !== "SUPER_ADMIN") {
    const count = await countSuperAdmins();
    if (count <= 1) {
      console.error("[users] role change rejected: would demote last SUPER_ADMIN");
      return;
    }
  }

  await db.user.update({
    where: { id: parsed.data.id },
    data: { role: parsed.data.role },
  });

  await logAudit({
    userId: actor.id,
    action: "user.changeRole",
    entity: "User",
    entityId: parsed.data.id,
    meta: { email: target.email, from: target.role, to: parsed.data.role },
  });

  revalidatePath("/admin/users");
}
