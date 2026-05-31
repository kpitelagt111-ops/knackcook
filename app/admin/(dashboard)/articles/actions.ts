"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/auth/audit";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { revalidateArticles } from "@/lib/revalidate";

const STATUS_VALUES = ["DRAFT", "IN_REVIEW", "PUBLISHED"] as const;
const TYPE_VALUES = ["GUIDE", "COMPARISON", "LISTICLE", "HOWTO", "NEWS"] as const;

const updateArticleSchema = z.object({
  id: z.string().min(1),
  type: z.enum(TYPE_VALUES),
  authorId: z.string().min(1),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case."),
  title: z.string().trim().min(1).max(255),
  excerpt: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  body: z.string().min(1),
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
});

const setStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(STATUS_VALUES),
});

const linkSchema = z.object({
  id: z.string().min(1),
  asin: z.string().trim().min(1).max(32),
});

const unlinkSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
});

function fieldString(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === "string" ? value : undefined;
}

function fail(message: string | undefined): never {
  throw new Error(message ?? "Invalid input.");
}

export async function updateArticle(formData: FormData): Promise<void> {
  const user = await requireRole("EDITOR");
  const parsed = updateArticleSchema.safeParse({
    id: fieldString(formData, "id"),
    type: fieldString(formData, "type"),
    authorId: fieldString(formData, "authorId"),
    slug: fieldString(formData, "slug"),
    title: fieldString(formData, "title"),
    excerpt: fieldString(formData, "excerpt"),
    body: fieldString(formData, "body"),
    metaTitle: fieldString(formData, "metaTitle"),
    metaDescription: fieldString(formData, "metaDescription"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message);
  const data = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.article.update({
      where: { id: data.id },
      data: {
        type: data.type,
        authorId: data.authorId,
        slug: data.slug,
      },
    });
    await tx.articleTranslation.upsert({
      where: { articleId_locale: { articleId: data.id, locale: "en" } },
      create: {
        articleId: data.id,
        locale: "en",
        title: data.title,
        body: data.body,
        excerpt: data.excerpt,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        slug: data.slug,
      },
      update: {
        title: data.title,
        body: data.body,
        excerpt: data.excerpt,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        slug: data.slug,
      },
    });
  });

  await logAudit({
    userId: user.id,
    action: "article.update",
    entity: "Article",
    entityId: data.id,
  });

  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${data.id}`);
}

export async function setArticleStatus(formData: FormData): Promise<void> {
  const user = await requireRole("EDITOR");
  const parsed = setStatusSchema.safeParse({
    id: fieldString(formData, "id"),
    status: fieldString(formData, "status"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message);

  const publishedAt = parsed.data.status === "PUBLISHED" ? new Date() : null;

  await db.article.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status, publishedAt },
  });

  await logAudit({
    userId: user.id,
    action: "article.setStatus",
    entity: "Article",
    entityId: parsed.data.id,
    meta: { status: parsed.data.status },
  });

  if (parsed.data.status === "PUBLISHED") {
    revalidateArticles();
  }

  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${parsed.data.id}`);
}

export async function linkProduct(formData: FormData): Promise<void> {
  const user = await requireRole("EDITOR");
  const parsed = linkSchema.safeParse({
    id: fieldString(formData, "id"),
    asin: fieldString(formData, "asin"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message);

  const product = await db.product.findUnique({
    where: { asin: parsed.data.asin },
    select: { id: true },
  });
  if (!product) {
    throw new Error(`No product with ASIN ${parsed.data.asin}.`);
  }

  const last = await db.articleProduct.findFirst({
    where: { articleId: parsed.data.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (last?.order ?? -1) + 1;

  await db.articleProduct.upsert({
    where: { articleId_productId: { articleId: parsed.data.id, productId: product.id } },
    create: {
      articleId: parsed.data.id,
      productId: product.id,
      role: "card",
      order: nextOrder,
    },
    update: {},
  });

  await logAudit({
    userId: user.id,
    action: "article.linkProduct",
    entity: "Article",
    entityId: parsed.data.id,
    meta: { productId: product.id, asin: parsed.data.asin },
  });

  revalidatePath(`/admin/articles/${parsed.data.id}`);
}

export async function unlinkProduct(formData: FormData): Promise<void> {
  const user = await requireRole("EDITOR");
  const parsed = unlinkSchema.safeParse({
    id: fieldString(formData, "id"),
    productId: fieldString(formData, "productId"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message);

  await db.articleProduct.delete({
    where: {
      articleId_productId: { articleId: parsed.data.id, productId: parsed.data.productId },
    },
  });

  await logAudit({
    userId: user.id,
    action: "article.unlinkProduct",
    entity: "Article",
    entityId: parsed.data.id,
    meta: { productId: parsed.data.productId },
  });

  revalidatePath(`/admin/articles/${parsed.data.id}`);
}
