import { useTranslations } from "next-intl";
import {
  type ButtonShape,
  type ButtonSize,
  type ButtonVariant,
  buttonStyles,
} from "@/components/ui/button";
import { cn } from "@/components/ui/cn";

/**
 * "View on Amazon" CTA — links through the tracking redirect.
 * NO price is shown at launch (compliance). REQ-P-05.
 */
export function AmazonCTA({
  asin,
  locale,
  variant = "primary",
  size = "md",
  shape = "rounded",
  full = false,
  className,
}: {
  asin: string;
  locale: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  /** Stretch the CTA to full width of its container. */
  full?: boolean;
  className?: string;
}) {
  const t = useTranslations("common");
  return (
    <a
      href={`/api/track/${asin}?locale=${locale}`}
      rel="nofollow sponsored noopener"
      target="_blank"
      className={cn(buttonStyles({ variant, size, shape }), full && "w-full", className)}
    >
      <span>{t("viewOnAmazon")}</span>
      <ArrowIcon className="size-4" />
    </a>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 10h12" />
      <path d="M11 5l5 5-5 5" />
    </svg>
  );
}
