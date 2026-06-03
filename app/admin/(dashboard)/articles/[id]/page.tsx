import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  Badge,
  type BadgeVariant,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmButton,
  cn,
  Input,
} from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import {
  deleteArticle,
  linkProduct,
  setArticleStatus,
  unlinkProduct,
  updateArticle,
} from "../actions";

const ARTICLE_TYPES = ["GUIDE", "COMPARISON", "LISTICLE", "HOWTO", "NEWS"] as const;

function statusBadgeVariant(status: "DRAFT" | "IN_REVIEW" | "PUBLISHED"): BadgeVariant {
  if (status === "PUBLISHED") return "success";
  if (status === "IN_REVIEW") return "ember";
  return "subtle";
}

const INPUT_CLASS =
  "block w-full rounded-xl border border-border-strong bg-surface px-4 text-sm text-foreground placeholder:text-subtle shadow-[inset_0_1px_2px_rgb(48_30_18_/_0.04)] transition-colors outline-none hover:border-ember-300 dark:hover:border-ember-500/70 focus-visible:border-ember-400 focus-visible:ring-2 focus-visible:ring-ember-400/30";

export default async function AdminArticleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("EDITOR");
  const { id } = await params;

  const [article, authors] = await Promise.all([
    db.article.findUnique({
      where: { id },
      include: {
        translations: { where: { locale: "en" }, take: 1 },
        author: { select: { id: true, name: true, slug: true } },
        products: {
          orderBy: { order: "asc" },
          include: {
            product: {
              select: {
                id: true,
                asin: true,
                slug: true,
                brand: true,
                translations: { where: { locale: "en" }, select: { title: true }, take: 1 },
              },
            },
          },
        },
      },
    }),
    db.author.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  if (!article) notFound();

  const translation = article.translations[0];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5">
        <Link
          href="/admin/articles"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted hover:text-ember-600 dark:hover:text-ember-300"
        >
          <span aria-hidden="true">←</span> All articles
        </Link>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3">
            <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
              <span className="rule-ember" />
              Article
            </span>
            <h1 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              {translation?.title ?? article.slug}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <Badge variant={statusBadgeVariant(article.status)} size="sm">
                {article.status.replace("_", " ")}
              </Badge>
              {article.source === "AI_DRAFT" ? (
                <Badge variant="ember" size="sm">
                  AI draft · needs review
                </Badge>
              ) : (
                <Badge variant="subtle" size="sm">
                  Human
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {article.status !== "IN_REVIEW" && article.status !== "PUBLISHED" && (
              <form action={setArticleStatus}>
                <input type="hidden" name="id" value={article.id} />
                <input type="hidden" name="status" value="IN_REVIEW" />
                <ConfirmButton
                  variant="outline"
                  size="sm"
                  confirmTitle="Send to review?"
                  confirmMessage={`"${translation?.title ?? article.slug}" will move to IN_REVIEW and wait for editorial sign-off.`}
                  confirmTone="primary"
                  confirmLabel="Send"
                >
                  Send to review
                </ConfirmButton>
              </form>
            )}
            {article.status !== "PUBLISHED" && (
              <form action={setArticleStatus}>
                <input type="hidden" name="id" value={article.id} />
                <input type="hidden" name="status" value="PUBLISHED" />
                <ConfirmButton
                  variant="primary"
                  size="sm"
                  confirmTitle="Publish this article?"
                  confirmMessage={`"${translation?.title ?? article.slug}" will become public on knackcook.com and trigger an ISR rebuild.`}
                  confirmTone="primary"
                  confirmLabel="Publish"
                >
                  Publish
                </ConfirmButton>
              </form>
            )}
            {article.status === "PUBLISHED" && (
              <form action={setArticleStatus}>
                <input type="hidden" name="id" value={article.id} />
                <input type="hidden" name="status" value="DRAFT" />
                <ConfirmButton
                  variant="outline"
                  size="sm"
                  confirmTitle="Unpublish this article?"
                  confirmMessage={`"${translation?.title ?? article.slug}" will be removed from the public site immediately.`}
                  confirmLabel="Unpublish"
                >
                  Unpublish
                </ConfirmButton>
              </form>
            )}
            <form action={deleteArticle}>
              <input type="hidden" name="id" value={article.id} />
              <ConfirmButton
                variant="ghost"
                size="sm"
                className="text-danger-600 hover:bg-danger-50 dark:text-danger-50 dark:hover:bg-danger-600/20"
                confirmTitle="Delete this article?"
                confirmMessage={`"${translation?.title ?? article.slug}" and all its translations and product links will be permanently removed. This cannot be undone.`}
                confirmLabel="Delete"
              >
                Delete
              </ConfirmButton>
            </form>
          </div>
        </div>
      </header>

      <form action={updateArticle} className="space-y-6">
        <input type="hidden" name="id" value={article.id} />

        <Card variant="default">
          <CardHeader>
            <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
              Article metadata
            </h2>
            <p className="text-xs text-muted">Slug, type, author and headline.</p>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Slug" htmlFor="slug" required>
              <Input
                id="slug"
                name="slug"
                defaultValue={article.slug}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
              />
            </Field>
            <Field label="Type" htmlFor="type" required>
              <select
                id="type"
                name="type"
                defaultValue={article.type}
                required
                className={cn(INPUT_CLASS, "h-11")}
              >
                {ARTICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Author" htmlFor="authorId" required>
              <select
                id="authorId"
                name="authorId"
                defaultValue={article.authorId}
                required
                className={cn(INPUT_CLASS, "h-11")}
              >
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title (English)" htmlFor="title" required>
              <Input
                id="title"
                name="title"
                defaultValue={translation?.title ?? ""}
                required
                maxLength={255}
              />
            </Field>
          </CardBody>
        </Card>

        <Card variant="default">
          <CardHeader>
            <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
              Content
            </h2>
            <p className="text-xs text-muted">
              Excerpt and body. MDX/HTML — never copy Amazon review text.
            </p>
          </CardHeader>
          <CardBody className="space-y-5">
            <Field label="Excerpt" htmlFor="excerpt">
              <textarea
                id="excerpt"
                name="excerpt"
                rows={3}
                defaultValue={translation?.excerpt ?? ""}
                maxLength={2000}
                className={cn(INPUT_CLASS, "py-3 leading-relaxed")}
              />
            </Field>
            <Field label="Body" htmlFor="body" hint="Serialized MDX/HTML. Editorial content only.">
              <textarea
                id="body"
                name="body"
                rows={20}
                required
                defaultValue={translation?.body ?? ""}
                className={cn(INPUT_CLASS, "py-3 font-mono leading-relaxed")}
              />
            </Field>
          </CardBody>
        </Card>

        <Card variant="default">
          <CardHeader>
            <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
              Search & social
            </h2>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Meta title" htmlFor="metaTitle">
              <Input
                id="metaTitle"
                name="metaTitle"
                defaultValue={translation?.metaTitle ?? ""}
                maxLength={255}
              />
            </Field>
            <Field label="Meta description" htmlFor="metaDescription">
              <Input
                id="metaDescription"
                name="metaDescription"
                defaultValue={translation?.metaDescription ?? ""}
                maxLength={500}
              />
            </Field>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg">
            Save changes
          </Button>
        </div>
      </form>

      <Card variant="default">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
              Linked products{" "}
              <span className="ml-1 text-sm font-normal text-muted tabular-nums">
                ({article.products.length})
              </span>
            </h2>
            <p className="text-xs text-muted">
              Link products by ASIN to display them as cards or comparisons inside this article.
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-5">
          <form
            action={linkProduct}
            className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
          >
            <input type="hidden" name="id" value={article.id} />
            <div>
              <label
                htmlFor="link-asin"
                className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
              >
                ASIN
              </label>
              <Input
                id="link-asin"
                name="asin"
                required
                maxLength={32}
                placeholder="B0XXXXXXXX"
                className="mt-1.5 font-mono"
              />
            </div>
            <Button type="submit" size="md">
              Link product
            </Button>
          </form>

          {article.products.length === 0 ? (
            <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-sm text-muted">
              No products linked yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {article.products.map((ap) => {
                const title = ap.product.translations[0]?.title ?? ap.product.slug;
                return (
                  <li
                    key={ap.product.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/products/${ap.product.id}`}
                        className="block truncate text-sm font-medium text-foreground hover:text-ember-600 dark:hover:text-ember-300"
                      >
                        {title}
                      </Link>
                      <div className="mt-0.5 text-xs text-subtle">
                        <span className="font-mono">{ap.product.asin}</span>
                        {ap.product.brand ? <> · {ap.product.brand}</> : null}
                        {` · role: ${ap.role}`}
                      </div>
                    </div>
                    <form action={unlinkProduct}>
                      <input type="hidden" name="id" value={article.id} />
                      <input type="hidden" name="productId" value={ap.product.id} />
                      <ConfirmButton
                        variant="ghost"
                        size="sm"
                        className="text-danger-600 hover:bg-danger-50 dark:text-danger-50 dark:hover:bg-danger-600/20"
                        confirmTitle="Unlink this product?"
                        confirmMessage={`"${title}" will no longer appear in this article. The product itself stays in the catalog.`}
                        confirmLabel="Unlink"
                      >
                        Unlink
                      </ConfirmButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
      >
        {label}
        {required ? <span className="ml-1 text-danger-600">*</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1.5 text-xs text-subtle">{hint}</p> : null}
    </div>
  );
}
