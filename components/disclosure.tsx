import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";

/** Affiliate disclosure (FTC + Amazon). REQ-LEG-01 / REQ-P-09. */
export function Disclosure({ className }: { className?: string }) {
  const t = useTranslations("disclosure");
  return (
    <p
      className={cn("inline-flex items-start gap-2 text-xs leading-relaxed text-muted", className)}
    >
      <span aria-hidden className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-ember-500" />
      <span>{t("short")}</span>
    </p>
  );
}
