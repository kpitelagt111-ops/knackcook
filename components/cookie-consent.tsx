"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "kk:consent";

/** Returns true once the visitor has accepted analytics cookies. */
export function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "accepted";
}

/**
 * GDPR cookie consent banner (REQ-LEG-04). Trackers (e.g. GA) must check
 * hasConsent() before loading. Choice persists in localStorage.
 */
export function CookieConsent() {
  const t = useTranslations("cookies");
  const [decided, setDecided] = useState(true);

  useEffect(() => {
    setDecided(localStorage.getItem(KEY) != null);
  }, []);

  function choose(value: "accepted" | "rejected") {
    localStorage.setItem(KEY, value);
    setDecided(true);
  }

  if (decided) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md"
    >
      <div className="rounded-2xl border border-border-strong bg-surface p-5 shadow-lift backdrop-blur">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-1 inline-flex size-2 shrink-0 rounded-full bg-ember-500"
          />
          <p className="text-sm leading-relaxed text-foreground">{t("message")}</p>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            onClick={() => choose("rejected")}
            variant="ghost"
            size="sm"
            shape="rounded"
          >
            {t("reject")}
          </Button>
          <Button
            type="button"
            onClick={() => choose("accepted")}
            variant="primary"
            size="sm"
            shape="rounded"
          >
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
