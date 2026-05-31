import { type NextRequest, NextResponse } from "next/server";
import { buildAffiliateUrl, isValidAsin } from "@/lib/affiliate/links";
import { db } from "@/lib/db";
import { isBotUserAgent } from "@/lib/utils/bot";

export const dynamic = "force-dynamic";

/**
 * GET /api/track/[asin]?locale=en
 * Logs a ClickEvent (ASIN, locale, User-Agent, isBot) then 302-redirects to the
 * locale's affiliate URL. Simple & synchronous (low volume). See REQ-T-01/02.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ asin: string }> }) {
  const { asin } = await ctx.params;
  if (!isValidAsin(asin)) {
    return NextResponse.json({ error: "invalid asin" }, { status: 400 });
  }

  const locale = req.nextUrl.searchParams.get("locale") ?? "en";
  const ua = req.headers.get("user-agent");

  // Resolve product (optional) to link the click; never blocks the redirect.
  const product = await db.product.findUnique({ where: { asin }, select: { id: true } });

  try {
    await db.clickEvent.create({
      data: {
        asin,
        productId: product?.id,
        locale,
        userAgent: ua ?? undefined,
        isBot: isBotUserAgent(ua),
      },
    });
  } catch {
    // Tracking must never break the user's redirect.
  }

  return NextResponse.redirect(buildAffiliateUrl(asin, locale), 302);
}
