"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Link } from "@/i18n/navigation";
import type { ProductCardData } from "@/lib/products/queries";

const KEY = "kk:wishlist";
const EVENT = "kk:wishlist-change";

function readSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

type State =
  | { phase: "loading" }
  | { phase: "ready"; slugs: string[]; products: ProductCardData[] }
  | { phase: "error" };

export default function WishlistPage() {
  const t = useTranslations("wishlist");
  const locale = useLocale();
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const slugs = readSlugs();
      if (slugs.length === 0) {
        if (!cancelled) setState({ phase: "ready", slugs: [], products: [] });
        return;
      }
      try {
        const url = `/api/products/by-slugs?locale=${encodeURIComponent(locale)}&slugs=${encodeURIComponent(slugs.join(","))}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`http_${res.status}`);
        const json = (await res.json()) as { products: ProductCardData[] };
        if (!cancelled) {
          setState({ phase: "ready", slugs, products: json.products });
        }
      } catch {
        if (!cancelled) setState({ phase: "error" });
      }
    };
    void load();
    const onChange = () => {
      void load();
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", (e: StorageEvent) => {
      if (e.key === KEY) onChange();
    });
    return () => {
      cancelled = true;
      window.removeEventListener(EVENT, onChange);
    };
  }, [locale]);

  const count =
    state.phase === "ready" ? state.products.length : state.phase === "loading" ? null : 0;

  const kicker =
    state.phase === "loading"
      ? null
      : count != null && count > 0
        ? `${count} item${count === 1 ? "" : "s"} on your list.`
        : t("empty");

  return (
    <main>
      <section className="border-b border-border bg-paper-soft">
        <Container size="lg" className="py-14 sm:py-20">
          <SectionHeading
            level="h1"
            eyebrow="Saved for later"
            title={t("title")}
            kicker={kicker ?? ""}
          />
        </Container>
      </section>

      <section>
        <Container size="lg" className="py-12 sm:py-16">
          {state.phase === "loading" ? (
            <ul
              aria-busy="true"
              aria-label={t("title")}
              className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4"
            >
              {Array.from({ length: 4 }).map((_unused, i) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, order is fixed
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-2xl border border-border bg-surface-2"
                />
              ))}
            </ul>
          ) : state.phase === "error" ? (
            <ErrorState onRetry={() => setState({ phase: "loading" })} />
          ) : state.products.length === 0 ? (
            <EmptyState empty={t("empty")} />
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {state.products.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} />
                  </li>
                ))}
              </ul>

              {state.slugs.length > state.products.length ? (
                <p className="mt-6 text-xs text-subtle">
                  {state.slugs.length - state.products.length} item(s) in your list are no longer
                  available and were skipped.
                </p>
              ) : null}
            </>
          )}
        </Container>
      </section>
    </main>
  );
}

function EmptyState({ empty }: { empty: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-border-strong bg-surface p-10 text-center shadow-soft">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-ember-100 text-ember-600 dark:bg-ember-900/40 dark:text-ember-200">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
        </svg>
      </div>
      <p className="mt-5 text-base leading-relaxed text-muted">{empty}</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="text-sm font-medium text-ember-600 hover:text-ember-700 dark:text-ember-300 dark:hover:text-ember-200"
        >
          Browse the editorial picks →
        </Link>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-danger-600/30 bg-danger-50 p-8 text-center dark:bg-danger-600/15">
      <p className="text-sm font-medium text-danger-600 dark:text-danger-50">
        Couldn't load your wishlist. Check your connection and try again.
      </p>
      <Button
        type="button"
        onClick={onRetry}
        variant="outline"
        size="sm"
        shape="rounded"
        className="mt-4"
      >
        Retry
      </Button>
    </div>
  );
}
