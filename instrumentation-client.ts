import * as Sentry from "@sentry/nextjs";

/**
 * Next.js 16 client instrumentation.
 *
 * Sentry browser SDK is OPTIONAL: when `NEXT_PUBLIC_SENTRY_DSN` is not set,
 * this module is a complete no-op and the browser bundle behaves identically
 * to a setup without Sentry.
 *
 * See AGENTS.md — no PII, no session replay by default, conservative sampling.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

// Required by Next 16 to propagate router transition spans to Sentry.
export const onRouterTransitionStart = dsn ? Sentry.captureRouterTransitionStart : undefined;
