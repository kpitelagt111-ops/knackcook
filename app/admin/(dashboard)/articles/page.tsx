import type { ContentStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import {
  Badge,
  type BadgeVariant,
  Button,
  buttonStyles,
  Card,
  CardBody,
  Input,
} from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { setArticleStatus } from "./actions";

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

export default async function AdminArticlesPage({
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

  const where: Prisma.ArticleWhereInput = {};
  if (status !== "ALL") where.status = status;
  if (q.length > 0) {
    where.OR = [
      { slug: { contains: q, mode: "insensitive" } },
      { translations: { some: { title: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [total, rows] = await Promise.all([
    db.article.count({ where }),
    db.article.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        type: true,
        status: true,
        source: true,
        publishedAt: true,
        updatedAt: true,
        author: { select: { name: true, slug: true } },
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
    return qs ? `/admin/articles?${qs}` : "/admin/articles";
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
          <span className="rule-ember" />
          Editorial
        </span>
        <h1 className="font-display text-4xl font-medium tracking-tight text-foreground">
          Articles
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          <span className="font-medium text-foreground tabular-nums">{total}</span> total · AI
          drafts must be reviewed by a human before publishing.
        </p>
      </header>

      <Card variant="muted">
        <CardBody>
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
            action="/admin/articles"
          >
            <div>
              <label
                htmlFor="q"
                className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
              >
                Search title or slug
              </label>
              <Input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="e.g. best chef knife"
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
                href="/admin/articles"
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
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Author</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Source</th>
                <th className="px-5 py-3.5">Published</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted">
                    No articles found.
                  </td>
                </tr>
              ) : (
                rows.map((a) => {
                  const title = a.translations[0]?.title ?? a.slug;
                  return (
                    <tr key={a.id} className="transition-colors hover:bg-surface-2/60">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/articles/${a.id}`}
                          className="block font-medium text-foreground hover:text-ember-600 dark:hover:text-ember-300"
                        >
                          {title}
                        </Link>
                        <div className="mt-0.5 text-xs text-subtle">{a.slug}</div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs uppercase tracking-wide text-muted">
                        {a.type}
                      </td>
                      <td className="px-5 py-3.5 text-muted">{a.author.name}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={statusBadgeVariant(a.status)} size="sm">
                          {a.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        {a.source === "AI_DRAFT" ? (
                          <Badge variant="ember" size="sm">
                            AI draft
                          </Badge>
                        ) : (
                          <span className="text-xs uppercase tracking-wide text-subtle">Human</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-subtle">
                        {a.publishedAt ? a.publishedAt.toISOString().slice(0, 10) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {a.status !== "PUBLISHED" && (
                            <form action={setArticleStatus}>
                              <input type="hidden" name="id" value={a.id} />
                              <input type="hidden" name="status" value="PUBLISHED" />
                              <Button type="submit" variant="primary" size="sm">
                                Publish
                              </Button>
                            </form>
                          )}
                          {a.status === "DRAFT" && (
                            <form action={setArticleStatus}>
                              <input type="hidden" name="id" value={a.id} />
                              <input type="hidden" name="status" value="IN_REVIEW" />
                              <Button type="submit" variant="outline" size="sm">
                                Review
                              </Button>
                            </form>
                          )}
                          {a.status === "PUBLISHED" && (
                            <form action={setArticleStatus}>
                              <input type="hidden" name="id" value={a.id} />
                              <input type="hidden" name="status" value="DRAFT" />
                              <Button type="submit" variant="outline" size="sm">
                                Unpublish
                              </Button>
                            </form>
                          )}
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
