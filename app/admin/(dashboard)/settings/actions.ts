"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/auth/audit";
import { requireRole } from "@/lib/auth/guards";
import { SETTING_KEYS, upsertSetting } from "@/lib/settings";

/**
 * Server actions for editing the `Setting` key/value table.
 *
 * Each call is gated by `requireRole("SUPER_ADMIN")` (defense-in-depth on top
 * of the route-group layout guard) and writes an `AuditLog` row so the change
 * is traceable. Form-bound entry points return `Promise<void>` to match
 * React's `<form action>` contract; validation failures are logged server-side
 * and the page revalidates so the operator sees the canonical state.
 */

const ALLOWED_KEYS = new Set<string>(Object.values(SETTING_KEYS));

const stringValueSchema = z.object({
  kind: z.literal("string"),
  value: z.string().max(2000),
});

const booleanValueSchema = z.object({
  kind: z.literal("boolean"),
  value: z.boolean(),
});

const affiliateTagsSchema = z.object({
  kind: z.literal("affiliateTags"),
  value: z.record(z.string().min(1).max(16), z.string().min(1).max(64)),
});

const valueSchema = z.discriminatedUnion("kind", [
  stringValueSchema,
  booleanValueSchema,
  affiliateTagsSchema,
]);

export type SaveSettingInput = z.infer<typeof valueSchema> & { key: string };

async function persistSetting(input: SaveSettingInput): Promise<void> {
  const user = await requireRole("SUPER_ADMIN");

  if (!ALLOWED_KEYS.has(input.key)) {
    console.error(`[settings] rejected unknown key: ${input.key}`);
    return;
  }

  const parsed = valueSchema.safeParse(input);
  if (!parsed.success) {
    console.error(`[settings] validation failed for ${input.key}`, parsed.error.issues);
    return;
  }

  // Narrow to a Prisma-safe JSON value depending on kind.
  let storedValue: Prisma.InputJsonValue;
  switch (parsed.data.kind) {
    case "string":
      storedValue = parsed.data.value;
      break;
    case "boolean":
      storedValue = parsed.data.value;
      break;
    case "affiliateTags":
      storedValue = parsed.data.value;
      break;
  }

  await upsertSetting(input.key, storedValue);
  await logAudit({
    userId: user.id,
    action: "setting.update",
    entity: "Setting",
    entityId: input.key,
    meta: { key: input.key, kind: parsed.data.kind },
  });

  revalidatePath("/admin/settings");
}

export async function saveSetting(input: SaveSettingInput): Promise<void> {
  await persistSetting(input);
}

export async function saveStringSetting(formData: FormData): Promise<void> {
  const key = String(formData.get("key") ?? "");
  const value = String(formData.get("value") ?? "");
  await persistSetting({ key, kind: "string", value });
}

export async function saveBooleanSetting(formData: FormData): Promise<void> {
  const key = String(formData.get("key") ?? "");
  const value = formData.get("value") === "true";
  await persistSetting({ key, kind: "boolean", value });
}

export async function saveAffiliateTagsSetting(formData: FormData): Promise<void> {
  const raw = String(formData.get("value") ?? "{}");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("[settings] affiliate.tags rejected: invalid JSON");
    return;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    console.error("[settings] affiliate.tags rejected: not an object");
    return;
  }
  const value: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v !== "string") {
      console.error(`[settings] affiliate.tags[${k}] is not a string`);
      return;
    }
    value[k] = v;
  }
  await persistSetting({ key: SETTING_KEYS.affiliateTags, kind: "affiliateTags", value });
}
