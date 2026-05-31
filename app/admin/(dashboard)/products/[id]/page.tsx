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
  cn,
  Input,
} from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { deleteProduct, setProductStatus, toggleProductActive, updateProduct } from "../actions";

type ProsCons = { pros?: string[]; cons?: string[] };

function parseProsCons(value: unknown): ProsCons {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const pros = Array.isArray(obj.pros)
      ? obj.pros.filter((s): s is string => typeof s === "string")
      : [];
    const cons = Array.isArray(obj.cons)
      ? obj.cons.filter((s): s is string => typeof s === "string")
      : [];
    return { pros, cons };
  }
  return { pros: [], cons: [] };
}

function statusBadgeVariant(status: "DRAFT" | "IN_REVIEW" | "PUBLISHED"): BadgeVariant {
  if (status === "PUBLISHED") return "success";
  if (status === "IN_REVIEW") return "ember";
  return "subtle";
}

const INPUT_CLASS =
  "block w-full rounded-xl border border-border-strong bg-surface px-4 text-sm text-foreground placeholder:text-subtle shadow-[inset_0_1px_2px_rgb(48_30_18_/_0.04)] transition-colors outline-none hover:border-ember-300 dark:hover:border-ember-500/70 focus-visible:border-ember-400 focus-visible:ring-2 focus-visible:ring-ember-400/30";

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("EDITOR");
  const { id } = await params;

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        translations: { where: { locale: "en" }, take: 1 },
        category: { select: { id: true, slug: true } },
      },
    }),
    db.category.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        slug: true,
        translations: { where: { locale: "en" }, select: { name: true }, take: 1 },
      },
    }),
  ]);

  if (!product) notFound();

  const translation = product.translations[0];
  const prosCons = parseProsCons(product.prosCons);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5">
        <Link
          href="/admin/products"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted hover:text-ember-600 dark:hover:text-ember-300"
        >
          <span aria-hidden="true">←</span> All products
        </Link>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3">
            <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
              <span className="rule-ember" />
              Product
            </span>
            <h1 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              {translation?.title ?? product.slug}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="font-mono text-xs">{product.asin}</span>
              <span aria-hidden="true" className="text-subtle">
                ·
              </span>
              <Badge variant={statusBadgeVariant(product.status)} size="sm">
                {product.status.replace("_", " ")}
              </Badge>
              <Badge variant={product.isActive ? "success" : "subtle"} size="sm">
                {product.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {product.status !== "IN_REVIEW" && product.status !== "PUBLISHED" && (
              <form action={setProductStatus}>
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="status" value="IN_REVIEW" />
                <Button type="submit" variant="outline" size="sm">
                  Send to review
                </Button>
              </form>
            )}
            {product.status !== "PUBLISHED" && (
              <form action={setProductStatus}>
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="status" value="PUBLISHED" />
                <Button type="submit" variant="primary" size="sm">
                  Publish
                </Button>
              </form>
            )}
            {product.status === "PUBLISHED" && (
              <form action={setProductStatus}>
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="status" value="DRAFT" />
                <Button type="submit" variant="outline" size="sm">
                  Unpublish
                </Button>
              </form>
            )}
            <form action={toggleProductActive}>
              <input type="hidden" name="id" value={product.id} />
              <input type="hidden" name="isActive" value={(!product.isActive).toString()} />
              <Button type="submit" variant="secondary" size="sm">
                {product.isActive ? "Set inactive" : "Set active"}
              </Button>
            </form>
            <form action={deleteProduct}>
              <input type="hidden" name="id" value={product.id} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-danger-600 hover:bg-danger-50 dark:text-danger-50 dark:hover:bg-danger-600/20"
              >
                Delete
              </Button>
            </form>
          </div>
        </div>
      </header>

      <form action={updateProduct} className="space-y-6">
        <input type="hidden" name="id" value={product.id} />

        <Card variant="default">
          <CardHeader>
            <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
              Core details
            </h2>
            <p className="text-xs text-muted">Identification, brand and category placement.</p>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Slug (English)" htmlFor="slug" required>
              <Input
                id="slug"
                name="slug"
                defaultValue={product.slug}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
              />
            </Field>

            <Field label="Brand" htmlFor="brand">
              <Input id="brand" name="brand" defaultValue={product.brand ?? ""} />
            </Field>

            <Field
              label="Editorial rating (0 – 10)"
              htmlFor="editorialRating"
              hint="Our rating only. Never republish Amazon stars."
            >
              <Input
                id="editorialRating"
                name="editorialRating"
                type="number"
                min={0}
                max={10}
                step={0.1}
                defaultValue={product.editorialRating ?? ""}
              />
            </Field>

            <Field label="Category" htmlFor="categoryId">
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={product.categoryId ?? ""}
                className={cn(INPUT_CLASS, "h-11")}
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.translations[0]?.name ?? c.slug}
                  </option>
                ))}
              </select>
            </Field>
          </CardBody>
        </Card>

        <Card variant="default">
          <CardHeader>
            <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
              Editorial review
            </h2>
            <p className="text-xs text-muted">
              Our written take, pros and cons. Compliance-critical content area.
            </p>
          </CardHeader>
          <CardBody className="space-y-5">
            <Field
              label="Editorial review"
              htmlFor="editorialReview"
              hint="Our written review only. Never copy Amazon review text."
            >
              <textarea
                id="editorialReview"
                name="editorialReview"
                rows={6}
                defaultValue={product.editorialReview ?? ""}
                className={cn(INPUT_CLASS, "py-3 leading-relaxed")}
              />
            </Field>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Pros (one per line)" htmlFor="prosText">
                <textarea
                  id="prosText"
                  name="prosText"
                  rows={5}
                  defaultValue={(prosCons.pros ?? []).join("\n")}
                  className={cn(INPUT_CLASS, "py-3 leading-relaxed")}
                />
              </Field>
              <Field label="Cons (one per line)" htmlFor="consText">
                <textarea
                  id="consText"
                  name="consText"
                  rows={5}
                  defaultValue={(prosCons.cons ?? []).join("\n")}
                  className={cn(INPUT_CLASS, "py-3 leading-relaxed")}
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card variant="default">
          <CardHeader>
            <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
              Search & social
            </h2>
            <p className="text-xs text-muted">Meta tags used for SEO and link previews.</p>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Meta title" htmlFor="metaTitle">
              <Input
                id="metaTitle"
                name="metaTitle"
                defaultValue={product.metaTitle ?? ""}
                maxLength={255}
              />
            </Field>
            <Field label="Meta description" htmlFor="metaDescription">
              <Input
                id="metaDescription"
                name="metaDescription"
                defaultValue={product.metaDescription ?? ""}
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
