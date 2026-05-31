import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type AuditEntry = {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue;
};

export async function logAudit(entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      userId: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      meta: entry.meta ?? undefined,
    },
  });
}
