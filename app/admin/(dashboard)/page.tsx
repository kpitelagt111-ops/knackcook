import type { ContentStatus } from "@prisma/client";
import Link from "next/link";
import { Badge, buttonStyles, Card, CardBody, CardHeader, cn } from "@/components/ui";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function firstNameOf(user: { name: string | null; email: string }): string {
  const raw = user.name ?? user.email.split("@")[0] ?? "there";
  return raw.split(/[\s.]+/)[0] ?? raw;
}

function statusBadgeVariant(status: ContentStatus): "ember" | "success" | "subtle" {
  if (status === "PUBLISHED") return "success";
  if (status === "IN_REVIEW") return "ember";
  return "subtle";
}

export default async function AdminDashboardPage() {
  const user = await requireUser();

  const sevenDaysAgo = new Date(Date.now() - 7 * MS_PER_DAY);
  const thirtyDaysAgo = new Date(Date.now() - 30 * MS_PER_DAY);

  const [
    productCount,
    publishedProductCount,
    draftProductCount,
    inReviewProductCount,
    articleCount,
    publishedArticleCount,
    aiDraftCount,
    categoryCount,
    totalClicks,
    last7Clicks,
    last30Clicks,
    recentProducts,
    recentArticles,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { status: "PUBLISHED" } }),
    db.product.count({ where: { status: "DRAFT" } }),
    db.product.count({ where: { status: "IN_REVIEW" } }),
    db.article.count(),
    db.article.count({ where: { status: "PUBLISHED" } }),
    db.article.count({ where: { source: "AI_DRAFT", status: { not: "PUBLISHED" } } }),
    db.category.count(),
    db.clickEvent.count({ where: { isBot: false } }),
    db.clickEvent.count({ where: { isBot: false, timestamp: { gte: sevenDaysAgo } } }),
    db.clickEvent.count({ where: { isBot: false, timestamp: { gte: thirtyDaysAgo } } }),
    db.product.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        slug: true,
        status: true,
        updatedAt: true,
        translations: { where: { locale: "en" }, select: { title: true }, take: 1 },
      },
    }),
    db.article.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        slug: true,
        status: true,
        source: true,
        updatedAt: true,
        translations: { where: { locale: "en" }, select: { title: true }, take: 1 },
      },
    }),
  ]);

  const firstName = firstNameOf(user);

  return (
    <div className="space-y-12">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
            <span className="rule-ember" />
            Signed in · {user.role.replace("_", " ").toLowerCase()}
          </span>
          <h1 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
            Good to see you, <span className="text-ember-600">{firstName}</span>.
          </h1>
          <p className="max-w-2xl text-base text-muted text-pretty">
            A snapshot of the catalog, editorial pipeline, and click activity across knackcook.com.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/articles"
            className={buttonStyles({ variant: "outline", size: "md", shape: "rounded" })}
          >
            Review pipeline
          </Link>
          <Link
            href="/admin/products"
            className={buttonStyles({ variant: "primary", size: "md", shape: "rounded" })}
          >
            Manage products
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Products"
          value={productCount}
          accent="ember"
          hint={`${publishedProductCount} published · ${draftProductCount + inReviewProductCount} in pipeline`}
        />
        <StatCard
          label="Articles"
          value={articleCount}
          hint={`${publishedArticleCount} published${aiDraftCount > 0 ? ` · ${aiDraftCount} AI drafts to review` : ""}`}
        />
        <StatCard label="Categories" value={categoryCount} hint="active navigation surfaces" />
        <StatCard
          label="Clicks tracked"
          value={totalClicks}
          hint={`${last7Clicks} last 7d · ${last30Clicks} last 30d`}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card variant="default">
          <CardHeader className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted">
                Catalog
              </p>
              <h2 className="mt-1 font-display text-xl font-medium tracking-tight text-foreground">
                Recent product updates
              </h2>
            </div>
            <Link
              href="/admin/products"
              className="text-xs font-medium text-ember-600 hover:text-ember-700 dark:text-ember-300 dark:hover:text-ember-200"
            >
              View all →
            </Link>
          </CardHeader>
          <CardBody className="pt-2">
            {recentProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No products yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentProducts.map((p) => {
                  const title = p.translations[0]?.title ?? p.slug;
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="block truncate text-sm font-medium text-foreground hover:text-ember-600 dark:hover:text-ember-300"
                        >
                          {title}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-subtle">
                          {p.slug} · updated {formatDay(p.updatedAt)}
                        </p>
                      </div>
                      <Badge variant={statusBadgeVariant(p.status)} size="sm">
                        {p.status.replace("_", " ")}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card variant="default">
          <CardHeader className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted">
                Editorial
              </p>
              <h2 className="mt-1 font-display text-xl font-medium tracking-tight text-foreground">
                Recent articles
              </h2>
            </div>
            <Link
              href="/admin/articles"
              className="text-xs font-medium text-ember-600 hover:text-ember-700 dark:text-ember-300 dark:hover:text-ember-200"
            >
              View all →
            </Link>
          </CardHeader>
          <CardBody className="pt-2">
            {recentArticles.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No articles yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentArticles.map((a) => {
                  const title = a.translations[0]?.title ?? a.slug;
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/articles/${a.id}`}
                          className="block truncate text-sm font-medium text-foreground hover:text-ember-600 dark:hover:text-ember-300"
                        >
                          {title}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 truncate text-xs text-subtle">
                          <span>updated {formatDay(a.updatedAt)}</span>
                          {a.source === "AI_DRAFT" ? (
                            <Badge variant="ember" size="sm">
                              AI draft
                            </Badge>
                          ) : null}
                        </p>
                      </div>
                      <Badge variant={statusBadgeVariant(a.status)} size="sm">
                        {a.status.replace("_", " ")}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="rule-ember" />
          <h2 className="font-display text-xl font-medium tracking-tight text-foreground">
            Quick actions
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink
            href="/admin/products"
            title="Review queue"
            description={`${inReviewProductCount} product${inReviewProductCount === 1 ? "" : "s"} waiting`}
          />
          <QuickLink
            href="/admin/articles"
            title="AI drafts"
            description={`${aiDraftCount} pending human review`}
            emphasize={aiDraftCount > 0}
          />
          <QuickLink
            href="/admin/sync"
            title="n8n sync"
            description="Trigger a manual ingestion run"
          />
          <QuickLink
            href="/admin/analytics"
            title="Click activity"
            description="Top products & daily trend"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent?: "ember";
}) {
  return (
    <Card variant={accent === "ember" ? "ember" : "default"} className="overflow-hidden">
      <CardBody className="flex flex-col gap-2">
        <span
          className={cn(
            "text-[0.7rem] font-medium uppercase tracking-[0.18em]",
            accent === "ember" ? "text-ember-700 dark:text-ember-300" : "text-muted",
          )}
        >
          {label}
        </span>
        <span className="font-display text-4xl font-medium leading-none tracking-tight tabular-nums text-foreground">
          {value.toLocaleString()}
        </span>
        <span
          className={cn(
            "text-xs",
            accent === "ember" ? "text-ember-700/80 dark:text-ember-300/80" : "text-subtle",
          )}
        >
          {hint}
        </span>
      </CardBody>
    </Card>
  );
}

function QuickLink({
  href,
  title,
  description,
  emphasize,
}: {
  href: string;
  title: string;
  description: string;
  emphasize?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-2xl border bg-surface px-5 py-4 transition-all duration-200",
        "hover:border-ember-300 dark:hover:border-ember-500/70 hover:shadow-card hover:-translate-y-0.5",
        emphasize ? "border-ember-300 shadow-soft" : "border-border",
      )}
    >
      <p className="font-display text-base font-medium tracking-tight text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-ember-600">
        Open
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  );
}
