import { NextResponse } from "next/server";

/**
 * Verification route for Sentry capture.
 *
 * NOTE on path: the original spec called for `/api/_debug/sentry`, but Next.js
 * App Router treats folders prefixed with `_` as private and excludes them
 * from routing. The endpoint was renamed to `/api/debug/sentry` so the
 * operator can actually reach it. Behavior is unchanged.
 *
 * - When `SENTRY_DSN` is NOT set: returns `{ sentry: "disabled" }` with 200.
 *   This makes the endpoint safe to leave in production while Sentry is off.
 * - When `SENTRY_DSN` IS set: throws a test error so Sentry's `onRequestError`
 *   hook captures it. Operators can use this to confirm the integration.
 *
 * This endpoint performs no mutations and contains no PII.
 */
export const dynamic = "force-dynamic";

export function GET(): Response {
  if (!process.env.SENTRY_DSN) {
    return NextResponse.json({ sentry: "disabled" }, { status: 200 });
  }

  throw new Error("Sentry verification error from /api/debug/sentry");
}
