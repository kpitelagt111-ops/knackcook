import { Badge, Button, Card, CardBody, CardHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { triggerSync } from "./actions";

export const dynamic = "force-dynamic";

type SyncLogRow = {
  id: string;
  startedAt: Date;
  created: number;
  updated: number;
  skipped: number;
  errors: unknown;
};

function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function summarizeErrors(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return `${value.length} error(s)`;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.note === "string") return obj.note;
    if (Array.isArray(obj.errors)) return `${obj.errors.length} error(s)`;
    const keys = Object.keys(obj);
    return keys.length === 0 ? "—" : keys.join(", ");
  }
  return String(value);
}

export default async function SyncPage() {
  await requireRole("EDITOR");

  const logs: SyncLogRow[] = await db.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
    select: {
      id: true,
      startedAt: true,
      created: true,
      updated: true,
      skipped: true,
      errors: true,
    },
  });

  const last = logs[0] ?? null;
  const webhookConfigured = Boolean(process.env.N8N_SYNC_WEBHOOK_URL);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
          <span className="rule-ember" />
          Pipeline
        </span>
        <h1 className="font-display text-4xl font-medium tracking-tight text-foreground">Sync</h1>
        <p className="max-w-2xl text-sm text-muted">
          History of ingestion runs from n8n. Counts reflect{" "}
          <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-ember-700">
            SyncLog
          </code>{" "}
          rows written by the ingestion endpoints.
        </p>
      </header>

      <Card variant="default">
        <CardHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
              Last sync
            </h2>
            <Badge variant={webhookConfigured ? "success" : "ember"} size="sm">
              {webhookConfigured ? "Webhook live" : "Webhook not configured"}
            </Badge>
          </div>
          <p className="text-xs text-muted">
            Operators can trigger a run between scheduled n8n cycles.
          </p>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {last ? (
                <p className="text-sm text-foreground">
                  <span className="font-mono text-xs text-subtle">
                    {formatDateTime(last.startedAt)}
                  </span>
                  <span className="mx-2 text-subtle">·</span>
                  <span className="font-medium text-foreground tabular-nums">{last.created}</span>{" "}
                  <span className="text-muted">created,</span>{" "}
                  <span className="font-medium text-foreground tabular-nums">{last.updated}</span>{" "}
                  <span className="text-muted">updated,</span>{" "}
                  <span className="font-medium text-foreground tabular-nums">{last.skipped}</span>{" "}
                  <span className="text-muted">skipped</span>
                </p>
              ) : (
                <p className="text-sm text-muted">No sync has run yet.</p>
              )}
            </div>
            <form action={triggerSync}>
              <Button type="submit" size="md">
                Trigger manual sync
              </Button>
            </form>
          </div>

          {webhookConfigured ? (
            <p className="mt-4 rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">
              n8n webhook configured via{" "}
              <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.7rem] text-ember-700 dark:text-ember-300">
                N8N_SYNC_WEBHOOK_URL
              </code>
              .
            </p>
          ) : (
            <p className="mt-4 rounded-xl border border-ember-200 bg-ember-50 px-3 py-2 text-xs text-ember-700 dark:border-ember-700/60 dark:bg-ember-900/30 dark:text-ember-200">
              n8n trigger is not configured. Set{" "}
              <code className="rounded bg-ember-100 px-1.5 py-0.5 font-mono text-[0.7rem] dark:bg-ember-800/60 dark:text-ember-100">
                N8N_SYNC_WEBHOOK_URL
              </code>{" "}
              in the environment to enable the manual trigger. The button will record the intent in
              the audit log either way.
            </p>
          )}
        </CardBody>
      </Card>

      <Card variant="default" className="overflow-hidden">
        <CardHeader>
          <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
            History
          </h2>
          <p className="text-xs text-muted">Most recent 50 runs.</p>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-2">
              <tr className="text-left text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted">
                <th className="px-5 py-3">Started at</th>
                <th className="px-5 py-3 text-right">Created</th>
                <th className="px-5 py-3 text-right">Updated</th>
                <th className="px-5 py-3 text-right">Skipped</th>
                <th className="px-5 py-3">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted">
                    No history yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-5 py-3 font-mono text-xs text-muted">
                      {formatDateTime(log.startedAt)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-foreground">
                      {log.created}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-foreground">
                      {log.updated}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-foreground">
                      {log.skipped}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">{summarizeErrors(log.errors)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
