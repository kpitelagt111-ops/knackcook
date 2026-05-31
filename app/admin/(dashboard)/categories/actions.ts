"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/auth/audit";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { revalidateProducts } from "@/lib/revalidate";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case.");

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
});

const renameSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
});

const deleteSchema = z.object({ id: z.string().min(1) });

const reorderSchema = z.object({
  id: z.string().min(1),
  direction: z.enum(["up", "down"]),
});

function fieldString(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === "string" ? value : undefined;
}

function fail(message: string | undefined): never {
  throw new Error(message ?? "Invalid input.");
}

export async function createCategory(formData: FormData): Promise<void> {
  const user = await requireRole("EDITOR");
  const parsed = createSchema.safeParse({
    name: fieldString(formData, "name"),
    slug: fieldString(formData, "slug"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message);

  const last = await db.category.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (last?.order ?? -1) + 1;

  const created = await db.category.create({
    data: {
      slug: parsed.data.slug,
      order: nextOrder,
      translations: {
        create: { locale: "en", name: parsed.data.name, slug: parsed.data.slug },
      },
    },
  });

  await logAudit({
    userId: user.id,
    action: "category.create",
    entity: "Category",
    entityId: created.id,
    meta: { slug: parsed.data.slug },
  });

  revalidateProducts();
  revalidatePath("/admin/categories");
}

export async function renameCategory(formData: FormData): Promise<void> {
  const user = await requireRole("EDITOR");
  const parsed = renameSchema.safeParse({
    id: fieldString(formData, "id"),
    name: fieldString(formData, "name"),
    slug: fieldString(formData, "slug"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message);

  await db.$transaction(async (tx) => {
    await tx.category.update({
      where: { id: parsed.data.id },
      data: { slug: parsed.data.slug },
    });
    await tx.categoryTranslation.upsert({
      where: {
        categoryId_locale: { categoryId: parsed.data.id, locale: "en" },
      },
      create: {
        categoryId: parsed.data.id,
        locale: "en",
        name: parsed.data.name,
        slug: parsed.data.slug,
      },
      update: { name: parsed.data.name, slug: parsed.data.slug },
    });
  });

  await logAudit({
    userId: user.id,
    action: "category.rename",
    entity: "Category",
    entityId: parsed.data.id,
    meta: { slug: parsed.data.slug, name: parsed.data.name },
  });

  revalidateProducts();
  revalidatePath("/admin/categories");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const user = await requireRole("EDITOR");
  const parsed = deleteSchema.safeParse({ id: fieldString(formData, "id") });
  if (!parsed.success) fail(parsed.error.issues[0]?.message);

  const productCount = await db.product.count({ where: { categoryId: parsed.data.id } });
  if (productCount > 0) {
    throw new Error(`Cannot delete: ${productCount} product(s) reference this category.`);
  }

  await db.category.delete({ where: { id: parsed.data.id } });

  await logAudit({
    userId: user.id,
    action: "category.delete",
    entity: "Category",
    entityId: parsed.data.id,
  });

  revalidateProducts();
  revalidatePath("/admin/categories");
}

export async function reorderCategory(formData: FormData): Promise<void> {
  const user = await requireRole("EDITOR");
  const parsed = reorderSchema.safeParse({
    id: fieldString(formData, "id"),
    direction: fieldString(formData, "direction"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message);

  const all = await db.category.findMany({
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  const idx = all.findIndex((c) => c.id === parsed.data.id);
  if (idx === -1) throw new Error("Category not found.");

  const swapIdx = parsed.data.direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) return;

  const current = all[idx];
  const other = all[swapIdx];
  if (!current || !other) return;

  await db.$transaction([
    db.category.update({ where: { id: current.id }, data: { order: other.order } }),
    db.category.update({ where: { id: other.id }, data: { order: current.order } }),
  ]);

  await logAudit({
    userId: user.id,
    action: "category.reorder",
    entity: "Category",
    entityId: parsed.data.id,
    meta: { direction: parsed.data.direction },
  });

  revalidateProducts();
  revalidatePath("/admin/categories");
}
