import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/newsletter/confirm?token=... — completes double opt-in (REQ-N-02).
 * Marks the subscriber confirmed and clears the token, then redirects home.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ success: false, error: "missing token" }, { status: 400 });
  }

  const subscriber = await db.subscriber.findFirst({
    where: { confirmToken: token },
    select: { id: true },
  });
  if (!subscriber) {
    return NextResponse.json({ success: false, error: "invalid token" }, { status: 404 });
  }

  await db.subscriber.update({
    where: { id: subscriber.id },
    data: { confirmed: true, confirmToken: null },
  });

  return NextResponse.redirect(new URL("/en?subscribed=1", req.url), 302);
}
