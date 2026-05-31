import { Card, CardBody, CardHeader, cn } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type TopProductRow = {
  asin: string;
  clicks: number;
  title: string | null;
  slug: string | null;
};

type DayBucketRow = {
  day: string;
  clicks: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function getTotalHumanClicks(): Promise<number> {
  return db.clickEvent.count({ where: { isBot: false } });
}

async function getLast7DaysHumanClicks(): Promise<number> {
  const since = new Date(Date.now() - 7 * MS_PER_DAY);
  return db.clickEvent.count({ where: { isBot: false, timestamp: { gte: since } } });
}

async function getTopProducts(limit: number): Promise<TopProductRow[]> {
  const grouped = await db.clickEvent.groupBy({
    by: ["asin"],
    where: { isBot: false },
    _count: { _all: true },
    orderBy: { _count: { asin: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const asins = grouped.map((g) => g.asin);
  const products = await db.product.findMany({
    where: { asin: { in: asins } },
    select: {
      asin: true,
      slug: true,
      translations: { select: { title: true, locale: true } },
    },
  });

  const byAsin = new Map<string, { title: string | null; slug: string | null }>();
  for (const p of products) {
    const en = p.translations.find((t) => t.locale === "en");
    const title = en?.title ?? p.translations[0]?.title ?? null;
    byAsin.set(p.asin, { title, slug: p.slug });
  }

  return grouped.map((g) => {
    const info = byAsin.get(g.asin);
    return {
      asin: g.asin,
      clicks: g._count._all,
      title: info?.title ?? null,
      slug: info?.slug ?? null,
    };
  });
}

async function getClicksPerDay(days: number): Promise<DayBucketRow[]> {
  const today = startOfUtcDay(new Date());
  const start = new Date(today.getTime() - (days - 1) * MS_PER_DAY);

  const rows = await db.clickEvent.findMany({
    where: { isBot: false, timestamp: { gte: start } },
    select: { timestamp: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start.getTime() + i * MS_PER_DAY);
    buckets.set(formatDay(d), 0);
  }
  for (const r of rows) {
    const key = formatDay(startOfUtcDay(r.timestamp));
    const current = buckets.get(key);
    if (current !== undefined) buckets.set(key, current + 1);
  }

  return Array.from(buckets.entries())
    .map(([day, clicks]) => ({ day, clicks }))
    .sort((a, b) => (a.day < b.day ? 1 : -1));
}

export default async function AnalyticsPage() {
  await requireRole("EDITOR");

  const [totalClicks, last7Clicks, topProducts, perDay] = await Promise.all([
    getTotalHumanClicks(),
    getLast7DaysHumanClicks(),
    getTopProducts(10),
    getClicksPerDay(14),
  ]);

  const maxBar = perDay.reduce((acc, r) => Math.max(acc, r.clicks), 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
          <span className="rule-ember" />
          Performance
        </span>
        <h1 className="font-display text-4xl font-medium tracking-tight text-foreground">
          Analytics
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Click activity recorded by{" "}
          <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-ember-700 dark:text-ember-300">
            /api/track/[asin]
          </code>
          . Bot traffic is excluded.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total clicks · all-time" value={totalClicks} accent="ember" />
        <StatCard label="Clicks · last 7 days" value={last7Clicks} />
      </section>

      <Card variant="default" className="overflow-hidden">
        <CardHeader>
          <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
            Top 10 clicked products
          </h2>
          <p className="text-xs text-muted">Ranked by human click volume.</p>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-2">
              <tr className="text-left text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted">
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">ASIN</th>
                <th className="px-5 py-3 text-right">Clicks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted">
                    No clicks recorded yet.
                  </td>
                </tr>
              ) : (
                topProducts.map((row, index) => (
                  <tr key={row.asin} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-5 py-3 font-mono text-xs text-subtle">{index + 1}</td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-foreground">
                        {row.title ?? <span className="text-subtle">— (no product)</span>}
                      </span>
                      {row.slug ? (
                        <span className="ml-2 text-xs text-subtle">/{row.slug}</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">{row.asin}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums text-foreground">
                      {row.clicks.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card variant="default">
        <CardHeader>
          <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
            Clicks per day · last 14 days
          </h2>
          <p className="text-xs text-muted">UTC days, oldest at the bottom.</p>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2">
            {perDay.map((row) => {
              const pct = maxBar > 0 ? Math.max(2, Math.round((row.clicks / maxBar) * 100)) : 0;
              return (
                <li key={row.day} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3">
                  <span className="font-mono text-xs text-muted">{row.day}</span>
                  <span className="relative block h-2 overflow-hidden rounded-full bg-surface-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-ember-400 to-ember-600",
                        row.clicks === 0 &&
                          "from-cocoa-100 to-cocoa-100 dark:from-cocoa-600 dark:to-cocoa-600",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="text-right text-xs font-medium tabular-nums text-foreground">
                    {row.clicks.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: "ember" }) {
  return (
    <Card variant={accent === "ember" ? "ember" : "default"}>
      <CardBody className="flex flex-col gap-2">
        <span
          className={cn(
            "text-[0.7rem] font-medium uppercase tracking-[0.18em]",
            accent === "ember" ? "text-ember-700 dark:text-ember-200" : "text-muted",
          )}
        >
          {label}
        </span>
        <span className="font-display text-4xl font-medium leading-none tracking-tight tabular-nums text-foreground">
          {value.toLocaleString()}
        </span>
      </CardBody>
    </Card>
  );
}
