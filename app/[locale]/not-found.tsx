import { useTranslations } from "next-intl";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <main className="bg-paper grain relative isolate overflow-hidden">
      <Container
        size="md"
        className="relative z-10 flex flex-col items-center py-24 text-center sm:py-32"
      >
        <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
          <span className="rule-ember" />
          404
        </span>
        <p className="mt-8 font-display text-[clamp(6rem,18vw,12rem)] font-medium leading-none tracking-tight text-cocoa-700/15 dark:text-cream-50/10">
          404
        </p>
        <h1 className="-mt-10 font-display text-4xl font-medium tracking-tight text-foreground text-balance sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted text-pretty">
          {t("subtitle")}
        </p>
        <Link
          href="/"
          className={`${buttonStyles({ variant: "primary", size: "lg", shape: "rounded" })} mt-10`}
        >
          {t("cta")}
        </Link>
      </Container>
    </main>
  );
}
