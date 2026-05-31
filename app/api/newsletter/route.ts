import { randomBytes } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscribeSchema } from "@/lib/newsletter/schemas";
import { NEWSLETTER_LIMIT, rateLimit, rateLimitKey } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/newsletter — double opt-in signup (REQ-N-02/04).
 * Stores the subscriber as unconfirmed with a token. The confirmation email
 * (with the /api/newsletter/confirm link) is sent by n8n via an outbound
 * webhook; here we just persist and return the pending state.
 *
 * Public form → strict per-IP rate limit (5/min) to deter abuse/bots.
 */
export async function POST(req: NextRequest) {
  const limit = rateLimit(rateLimitKey(req, "newsletter:subscribe"), NEWSLETTER_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid JSON" }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "invalid email" }, { status: 400 });
  }

  const { email, locale } = parsed.data;
  const token = randomBytes(24).toString("hex");

  const existing = await db.subscriber.findUnique({
    where: { email },
    select: { confirmed: true },
  });
  if (existing?.confirmed) {
    return NextResponse.json({ success: true, status: "already_confirmed" });
  }

  await db.subscriber.upsert({
    where: { email },
    create: { email, locale, confirmed: false, confirmToken: token },
    update: { confirmToken: token, locale },
  });

  return NextResponse.json({ success: true, status: "pending" });
}
