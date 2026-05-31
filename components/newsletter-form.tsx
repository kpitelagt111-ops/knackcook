"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "idle" | "loading" | "pending" | "done" | "error";

export function NewsletterForm({ locale = "en" }: { locale?: string }) {
  const t = useTranslations("newsletter");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const data = (await res.json()) as { success: boolean; status?: string };
      if (data.success) {
        setStatus(data.status === "already_confirmed" ? "done" : "pending");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "pending") {
    return (
      <p className="rounded-xl border border-success-600/20 bg-success-50 px-4 py-3 text-sm font-medium text-success-600 dark:border-success-600/40 dark:bg-success-600/15 dark:text-success-50">
        {t("pending")}
      </p>
    );
  }
  if (status === "done") {
    return (
      <p className="rounded-xl border border-success-600/20 bg-success-50 px-4 py-3 text-sm font-medium text-success-600 dark:border-success-600/40 dark:bg-success-600/15 dark:text-success-50">
        {t("done")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex w-full flex-col gap-2 sm:flex-row">
      <label htmlFor="newsletter-email" className="sr-only">
        {t("placeholder")}
      </label>
      <Input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("placeholder")}
        inputSize="md"
        autoComplete="email"
        className="flex-1"
      />
      <Button
        type="submit"
        disabled={status === "loading"}
        variant="primary"
        shape="rounded"
        size="md"
      >
        {status === "loading" ? t("loading") : t("submit")}
      </Button>
      {status === "error" ? (
        <span className="self-center text-sm text-danger-600">{t("error")}</span>
      ) : null}
    </form>
  );
}
