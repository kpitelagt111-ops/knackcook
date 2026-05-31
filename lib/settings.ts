import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Typed accessor for the `Setting` key/value store.
 *
 * The `value` column is `Json`, but most callers want a strongly-typed shape
 * (booleans, strings, structured objects like the per-locale Amazon tag map).
 * `getSetting` lets the caller declare the expected runtime shape via a Zod-
 * style parser; if parsing fails, the typed `fallback` is returned so callers
 * never have to deal with `unknown` themselves.
 */

export type SettingParser<T> = (raw: unknown) => T;

export async function getSetting<T>(
  key: string,
  fallback: T,
  parser?: SettingParser<T>,
): Promise<T> {
  const row = await db.setting.findUnique({ where: { key }, select: { value: true } });
  if (!row) return fallback;
  if (!parser) {
    // No parser: caller has asserted the JSON shape matches `T`.
    return row.value as unknown as T;
  }
  try {
    return parser(row.value);
  } catch {
    return fallback;
  }
}

export async function getSettings(keys: readonly string[]): Promise<Record<string, unknown>> {
  if (keys.length === 0) return {};
  const rows = await db.setting.findMany({
    where: { key: { in: [...keys] } },
    select: { key: true, value: true },
  });
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = undefined;
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export async function upsertSetting(key: string, value: Prisma.InputJsonValue): Promise<void> {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// ──────────────── Known setting keys & parsers ────────────────

export const SETTING_KEYS = {
  gaMeasurementId: "ga.measurementId",
  gaEnabled: "ga.enabled",
  creatorsApiEnabled: "creatorsApi.enabled",
  affiliateTags: "affiliate.tags",
  disclosureText: "disclosure.text",
} as const;

export type AffiliateTagsMap = Record<string, string>;

export function parseString(raw: unknown): string {
  if (typeof raw === "string") return raw;
  throw new Error("Expected string");
}

export function parseBoolean(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw;
  throw new Error("Expected boolean");
}

export function parseAffiliateTags(raw: unknown): AffiliateTagsMap {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const out: AffiliateTagsMap = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v !== "string") throw new Error(`affiliate.tags[${k}] is not a string`);
      out[k] = v;
    }
    return out;
  }
  throw new Error("Expected object for affiliate.tags");
}
