"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/auth/audit";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";

/**
 * Manual sync trigger.
 *
 * The actual ingestion is performed by an n8n workflow (see ARCHITECTURE §9).
 * From the back office we only POST to its webhook URL so an operator can
 * force a run between schedules. Everything is logged for traceability:
 *
 *   - the intent (always, via `AuditLog`),
 *   - a placeholder `SyncLog` row marking the kick-off (zero counts; n8n
 *     ingests will create their own rows when they push back).
 *
 * If `N8N_SYNC_WEBHOOK_URL` is not configured, the action records the intent
 * and returns — the page UI is responsible for telling the operator that the
 * webhook isn't wired up. Returns `Promise<void>` to satisfy React's
 * `<form action>` contract.
 */

export async function triggerSync(): Promise<void> {
  const actor = await requireRole("EDITOR");

  const webhookUrl = process.env.N8N_SYNC_WEBHOOK_URL ?? "";

  if (!webhookUrl) {
    await logAudit({
      userId: actor.id,
      action: "sync.trigger.skip",
      entity: "SyncLog",
      meta: { reason: "N8N_SYNC_WEBHOOK_URL not configured" },
    });
    revalidatePath("/admin/sync");
    return;
  }

  // Record kick-off intent. Counts stay at 0 — the real numbers are filled
  // when the ingestion endpoints write their own SyncLog rows.
  const logMeta: Prisma.InputJsonValue = { triggeredBy: actor.email, source: "admin-ui" };
  const syncLog = await db.syncLog.create({
    data: { errors: { note: "Manual trigger from /admin/sync", ...logMeta } },
    select: { id: true, startedAt: true },
  });

  let webhookOk = false;
  let webhookError: string | null = null;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: "admin-ui",
        triggeredBy: actor.email,
        syncLogId: syncLog.id,
        startedAt: syncLog.startedAt.toISOString(),
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      webhookError = `n8n responded with HTTP ${res.status}`;
    } else {
      webhookOk = true;
    }
  } catch (err) {
    webhookError = err instanceof Error ? err.message : "Unknown fetch error";
  }

  await logAudit({
    userId: actor.id,
    action: webhookOk ? "sync.trigger.ok" : "sync.trigger.error",
    entity: "SyncLog",
    entityId: syncLog.id,
    meta: webhookOk ? { syncLogId: syncLog.id } : { syncLogId: syncLog.id, error: webhookError },
  });

  if (!webhookOk) {
    console.error(`[sync] webhook call failed: ${webhookError ?? "unknown error"}`);
  }

  revalidatePath("/admin/sync");
}
