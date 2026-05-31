import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingestArticles } from "@/lib/ingest/articles-service";
import { isAuthorizedIngest } from "@/lib/ingest/auth";
import { checkCompliance } from "@/lib/ingest/compliance";
import { ingestArticlesPayloadSchema } from "@/lib/ingest/schemas";
import { INGEST_LIMIT, rateLimit, rateLimitKey } from "@/lib/ratelimit";
import { revalidateArticles } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

/**
 * POST /api/ingest/articles  (n8n → site)
 * Authorization: Bearer {INGEST_API_KEY}
 *
 * Upserts AI article drafts by slug as DRAFT. See REQUIREMENTS §4 (REQ-I-06).
 * Same layered guards as /api/ingest/products.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedIngest(req.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(rateLimitKey(req, "ingest:articles"), INGEST_LIMIT);
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

  const compliance = checkCompliance(body);
  if (!compliance.ok) {
    return NextResponse.json(
      { success: false, error: "compliance_violation", fields: compliance.fields },
      { status: 422 },
    );
  }

  const parsed = ingestArticlesPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await ingestArticles(db, parsed.data.articles);
  revalidateArticles();
  return NextResponse.json(result, { status: result.success ? 200 : 207 });
}
