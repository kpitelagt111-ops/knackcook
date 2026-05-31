import { type NextRequest, NextResponse } from "next/server";
import { isAuthorizedIngest } from "@/lib/ingest/auth";
import { INGEST_LIMIT, rateLimit, rateLimitKey } from "@/lib/ratelimit";
import { reindexProducts } from "@/lib/search/meili";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAuthorizedIngest(req.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(rateLimitKey(req, "ingest:reindex"), INGEST_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  try {
    const indexed = await reindexProducts();
    return NextResponse.json({ success: true, indexed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "reindex failed";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
