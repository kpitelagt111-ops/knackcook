"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { hasConsent } from "@/components/cookie-consent";

/**
 * Google Analytics 4 loader, gated on:
 *  1. A non-empty `gaId` prop (resolved server-side from
 *     NEXT_PUBLIC_GA_MEASUREMENT_ID or, later, a back-office setting).
 *  2. The visitor having accepted analytics cookies (REQ-LEG-04).
 *
 * Why a prop, not `process.env.NEXT_PUBLIC_*` here: this file is a client
 * component, so Next.js inlines the env var at BUILD time. Reading it in the
 * server layout and passing it as a prop keeps the ID configurable at runtime
 * (no rebuild needed to swap IDs or wire it to admin settings later).
 *
 * Listens for the `kk:consent-change` custom event so the script loads
 * immediately after the visitor clicks "Accept" — no page reload required.
 */
export function GoogleAnalytics({ gaId }: { gaId?: string }) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    setAccepted(hasConsent());
    const handler = () => setAccepted(hasConsent());
    window.addEventListener("kk:consent-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("kk:consent-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  if (!gaId || !accepted) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}
