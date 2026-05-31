"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/auth/audit";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { revalidateProducts } from "@/lib/revalidate";
import { reindexProducts } from "@/lib/search/meili";

const STATUS_VALUES = ["DRAFT", "IN_REVIEW", "PUBLISHED"] as const;

const updateProductSchema = z.object({
  id: z.string().min(1),
  brand: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  editorialRating: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 10), {
      message: "Editorial rating must be between 0 and 10.",
    }),
  editorialReview: z
    .string()
    .trim()
    .max(20000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  prosText: z.string().trim().max(4000).optional().default(""),
  consText: z.string().trim().max(4000).optional().default(""),
  metaTitle: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  metaDescription: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case."),
  categoryId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

const setStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(STATUS_VALUES),
});

const toggleActiveSchema = z.object({
  id: z.string().min(1),
  isActive: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

const deleteSchema = z.object({ id: z.string().min(1) });

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function fieldString(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === "string" ? value : undefined;
}

function fail(message: string | undefined): never {
  throw new Error(message ?? "Invalid input.");
}

export async function updateProduct(formData: FormData): Promise<void> {
  const user = await requireRole("EDITOR");
  const parsed = updateProductSchema.safeParse({
    id: fieldString(formData, "id"),
    brand: fieldString(formData, "brand"),
    editorialRating: fieldString(formData, "editorialRating"),
    editorialReview: fieldString(formData, "editorialReview"),
    prosText: fieldString(formData, "prosText"),
    consText: fieldString(formData, "consText"),
    metaTitle: fieldString(formData, "metaTitle"),
    metaDescription: fieldString(formData, "metaDescription"),
    slug: fieldString(formData, "slug"),
    categoryId: fieldString(formData, "categoryId"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message);
  const data = parsed.data;
  const pros = splitLines(data.prosText ?? "");
  const cons = splitLines(data.consText ?? "");

  await db.product.update({
    where: { id: data.id },
    data: {
      brand: data.brand,
      editorialRating: data.editorialRating,
      editorialReview: data.editorialReview,
      prosCons: { pros, cons },
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      slug: data.slug,
      categoryId: data.categoryId,
    },
  });

  await logAudit({
    userId: user.id,
    action: "product.update",
    entity: "Product",
    entityId: data.id,
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${data.id}`);
}

export async function setProductStatus(formData: FormData): Promise<void> {
  const user = await requireRole("EDITOR");
  const parsed = setStatusSchema.safeParse({
    id: fieldString(formData, "id"),
    status: fieldString(formData, "status"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message);

  await db.product.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });

  await logAudit({
    userId: user.id,
    action: "product.setStatus",
    entity: "Product",
    entityId: parsed.data.id,
    meta: { status: parsed.data.status },
  });

  revalidateProducts();

  if (parsed.data.status === "PUBLISHED") {
    try {
      await reindexProducts();
    } catch (error) {
      console.error("[admin/products] reindexProducts failed", error);
    }
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${parsed.data.id}`);
}

export async function toggleProductActive(formData: FormData): Promise<void> {
  const user = await requireRole("EDITOR");
  const parsed = toggleActiveSchema.safeParse({
    id: fieldString(formData, "id"),
    isActive: fieldString(formData, "isActive"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message);

  await db.product.update({
    where: { id: parsed.data.id },
    data: { isActive: parsed.data.isActive },
  });

  await logAudit({
    userId: user.id,
    action: "product.toggleActive",
    entity: "Product",
    entityId: parsed.data.id,
    meta: { isActive: parsed.data.isActive },
  });

  revalidateProducts();

  try {
    await reindexProducts();
  } catch (error) {
    console.error("[admin/products] reindexProducts failed", error);
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${parsed.data.id}`);
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const user = await requireRole("EDITOR");
  const parsed = deleteSchema.safeParse({ id: fieldString(formData, "id") });
  if (!parsed.success) fail(parsed.error.issues[0]?.message);

  await db.product.delete({ where: { id: parsed.data.id } });

  await logAudit({
    userId: user.id,
    action: "product.delete",
    entity: "Product",
    entityId: parsed.data.id,
  });

  revalidateProducts();

  try {
    await reindexProducts();
  } catch (error) {
    console.error("[admin/products] reindexProducts failed", error);
  }

  revalidatePath("/admin/products");
}
