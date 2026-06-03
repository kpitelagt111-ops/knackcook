import type { ContentStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import {
  Badge,
  type BadgeVariant,
  Button,
  buttonStyles,
  Card,
  CardBody,
  ConfirmButton,
  cn,
  Input,
} from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { deleteProduct, setProductStatus, toggleProductActive } from "./actions";

const PAGE_SIZE = 25;
const STATUS_FILTERS = ["ALL", "DRAFT", "IN_REVIEW", "PUBLISHED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

type SearchParams = {
  q?: string;
  page?: string;
  status?: string;
};

function parseStatusFilter(value: string | undefined): StatusFilter {
  if (value === "DRAFT" || value === "IN_REVIEW" || value === "PUBLISHED") return value;
  return "ALL";
}

function parsePage(value: string | undefined): number {
  const n = Number(value ?? "1");
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function statusBadgeVariant(status: ContentStatus): BadgeVariant {
  if (status === "PUBLISHED") return "success";
  if (status === "IN_REVIEW") return "ember";
  return "subtle";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("EDITOR");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = parseStatusFilter(sp.status);
  const page = parsePage(sp.page);
  const skip = (page - 1) * PAGE_SIZE;

  const where: Prisma.ProductWhereInput = {};
  if (status !== "ALL") where.status = status;
  if (q.length > 0) {
    where.OR = [
      { asin: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
      { translations: { some: { title: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        asin: true,
        slug: true,
        brand: true,
        status: true,
        isActive: true,
        editorialRating: true,
        updatedAt: true,
        category: { select: { slug: true } },
        translations: { where: { locale: "en" }, select: { title: true }, take: 1 },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(nextPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "ALL") params.set("status", status);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
            <span className="rule-ember" />
            Catalog
          </span>
          <h1 className="font-display text-4xl font-medium tracking-tight text-foreground">
            Products
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            <span className="font-medium text-foreground tabular-nums">{total}</span> total ·
            editorial rating &amp; review only — never republish Amazon prices or stars.
          </p>
        </div>
      </header>

      <Card variant="muted">
        <CardBody>
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
            action="/admin/products"
          >
            <div>
              <label
                htmlFor="q"
                className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
              >
                Search title, ASIN, slug or brand
              </label>
              <Input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="e.g. chef knife"
                className="mt-1.5"
              />
            </div>
            <div>
              <label
                htmlFor="status"
                className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status}
                className="mt-1.5 block h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-sm text-foreground transition-colors hover:border-ember-300 dark:hover:border-ember-500/70 focus-visible:border-ember-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/30 sm:w-44"
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="md">
              Apply
            </Button>
            {q || status !== "ALL" ? (
              <Link
                href="/admin/products"
                className={buttonStyles({ variant: "outline", size: "md", shape: "rounded" })}
              >
                Reset
              </Link>
            ) : null}
          </form>
        </CardBody>
      </Card>

      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-2">
              <tr className="text-left text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted">
                <th className="px-5 py-3.5">Title</th>
                <th className="px-5 py-3.5">ASIN</th>
                <th className="px-5 py-3.5">Brand</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Active</th>
                <th className="px-5 py-3.5 text-right">Rating</th>
                <th className="px-5 py-3.5">Updated</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm text-muted">
                    No products found.
                  </td>
                </tr>
              ) : (
                rows.map((p) => {
                  const title = p.translations[0]?.title ?? p.slug;
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-surface-2/60">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="block font-medium text-foreground hover:text-ember-600 dark:hover:text-ember-300"
                        >
                          {title}
                        </Link>
                        <div className="mt-0.5 text-xs text-subtle">{p.slug}</div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-muted">{p.asin}</td>
                      <td className="px-5 py-3.5 text-muted">{p.brand ?? "—"}</td>
                      <td className="px-5 py-3.5 text-muted">{p.category?.slug ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={statusBadgeVariant(p.status)} size="sm">
                          {p.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <form action={toggleProductActive}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="isActive" value={(!p.isActive).toString()} />
                          <button
                            type="submit"
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-medium uppercase tracking-[0.08em] transition-colors",
                              p.isActive
                                ? "bg-success-50 text-success-600 hover:bg-success-50/80 dark:bg-success-600/15 dark:text-success-50"
                                : "bg-surface-3 text-muted hover:bg-border-strong",
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                p.isActive ? "bg-success-600" : "bg-cocoa-300 dark:bg-cocoa-100",
                              )}
                            />
                            {p.isActive ? "Active" : "Inactive"}
                          </button>
                        </form>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-foreground">
                        {p.editorialRating != null ? p.editorialRating.toFixed(1) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-subtle">
                        {p.updatedAt.toISOString().slice(0, 10)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {p.status !== "PUBLISHED" && (
                            <form action={setProductStatus}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="status" value="PUBLISHED" />
                              <ConfirmButton
                                variant="primary"
                                size="sm"
                                confirmTitle="Publish this product?"
                                confirmMessage={`"${title}" (${p.asin}) will become eligible to appear publicly. It also needs to be Active to show on the site.`}
                                confirmTone="primary"
                                confirmLabel="Publish"
                              >
                                Publish
                              </ConfirmButton>
                            </form>
                          )}
                          {p.status === "DRAFT" && (
                            <form action={setProductStatus}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="status" value="IN_REVIEW" />
                              <ConfirmButton
                                variant="outline"
                                size="sm"
                                confirmTitle="Send to review?"
                                confirmMessage={`"${title}" will move to IN_REVIEW for editorial sign-off.`}
                                confirmTone="primary"
                                confirmLabel="Send"
                              >
                                Review
                              </ConfirmButton>
                            </form>
                          )}
                          {p.status === "PUBLISHED" && (
                            <form action={setProductStatus}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="status" value="DRAFT" />
                              <ConfirmButton
                                variant="outline"
                                size="sm"
                                confirmTitle="Unpublish this product?"
                                confirmMessage={`"${title}" will revert to DRAFT and disappear from the public site.`}
                                confirmLabel="Unpublish"
                              >
                                Unpublish
                              </ConfirmButton>
                            </form>
                          )}
                          <form action={deleteProduct}>
                            <input type="hidden" name="id" value={p.id} />
                            <ConfirmButton
                              variant="ghost"
                              size="sm"
                              className="text-danger-600 hover:bg-danger-50 dark:text-danger-50 dark:hover:bg-danger-600/20"
                              confirmTitle="Delete this product?"
                              confirmMessage={`"${title}" (${p.asin}) and all its translations, images and click events will be permanently removed. This cannot be undone.`}
                              confirmLabel="Delete"
                            >
                              Delete
                            </ConfirmButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-muted">
            Page <span className="font-medium text-foreground tabular-nums">{page}</span> of{" "}
            <span className="font-medium text-foreground tabular-nums">{totalPages}</span>
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={buildHref(page - 1)}
                className={buttonStyles({ variant: "outline", size: "sm", shape: "rounded" })}
              >
                ← Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={buildHref(page + 1)}
                className={buttonStyles({ variant: "outline", size: "sm", shape: "rounded" })}
              >
                Next →
              </Link>
            ) : null}
          </div>
        </nav>
      )}
    </div>
  );
}
