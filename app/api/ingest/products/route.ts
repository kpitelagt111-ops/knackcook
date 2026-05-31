import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthorizedIngest } from "@/lib/ingest/auth";
import { checkCompliance } from "@/lib/ingest/compliance";
import { ingestProductsPayloadSchema } from "@/lib/ingest/schemas";
import { ingestProducts } from "@/lib/ingest/service";
import { INGEST_LIMIT, rateLimit, rateLimitKey } from "@/lib/ratelimit";
import { revalidateProducts } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

/**
 * POST /api/ingest/products  (n8n → site)
 * Authorization: Bearer {INGEST_API_KEY}
 *
 * Upserts products by ASIN as DRAFT. Rejects any non-compliant payload
 * (scraped price/review/image) via the strict Zod schema. See REQUIREMENTS §4.
 *
 * Layered guards (fail-fast, in order):
 *   1) Auth        → 401
 *   2) Rate limit  → 429
 *   3) JSON parse  → 400
 *   4) Compliance  → 422 (AGENTS.md §2 hard block)
 *   5) Zod shape   → 400
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedIngest(req.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(rateLimitKey(req, "ingest:products"), INGEST_LIMIT);
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

  const parsed = ingestProductsPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await ingestProducts(db, parsed.data.products);
  revalidateProducts();
  return NextResponse.json(result, { status: result.success ? 200 : 207 });
}
