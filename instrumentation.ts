import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

/**
 * Next.js 16 instrumentation hook.
 *
 * Sentry is OPTIONAL: when `SENTRY_DSN` is not set, this is a complete no-op
 * and the application behaves identically to a setup without Sentry.
 *
 * See AGENTS.md — no PII, no session replay by default, conservative sampling.
 */
export async function register(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  const runtime = process.env.NEXT_RUNTIME;
  const environment = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV;

  if (runtime === "nodejs" || runtime === "edge") {
    Sentry.init({
      dsn,
      enabled: true,
      environment,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
  }
}

/**
 * Next.js 16 server request error hook. Captures uncaught errors thrown from
 * server components, route handlers, server actions and middleware.
 *
 * Guarded by DSN presence so that, without Sentry configured, this is a no-op.
 */
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  if (!process.env.SENTRY_DSN) {
    return;
  }
  Sentry.captureRequestError(err, request, context);
};
