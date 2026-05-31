import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { routing } from "@/i18n/routing";
import { getProductsBySlugs } from "@/lib/products/queries";

const QuerySchema = z.object({
  locale: z.enum(routing.locales as readonly [string, ...string[]]).default(routing.defaultLocale),
  slugs: z
    .string()
    .min(1)
    .transform((s) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter((x) => /^[a-z0-9-]{1,80}$/.test(x))
        .slice(0, 100),
    ),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const parsed = QuerySchema.safeParse({
    locale: req.nextUrl.searchParams.get("locale") ?? undefined,
    slugs: req.nextUrl.searchParams.get("slugs") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }
  const products = await getProductsBySlugs(parsed.data.slugs, parsed.data.locale);
  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "private, max-age=0, must-revalidate" } },
  );
}
