"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { hasConsent } from "@/components/cookie-consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Google Analytics 4 loader, gated on:
 *  1. NEXT_PUBLIC_GA_MEASUREMENT_ID env var (build-time).
 *  2. The visitor having accepted analytics cookies (REQ-LEG-04).
 *
 * Listens for the `kk:consent-change` custom event so the script loads
 * immediately after the visitor clicks "Accept" — no page reload required.
 */
export function GoogleAnalytics() {
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

  if (!GA_ID || !accepted) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}
