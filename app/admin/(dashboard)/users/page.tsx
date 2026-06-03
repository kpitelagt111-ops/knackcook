import { Badge, Button, Card, CardBody, CardHeader, cn, Input } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import {
  changeAdminUserPassword,
  changeAdminUserRole,
  createAdminUser,
  deleteAdminUser,
} from "./actions";

export const dynamic = "force-dynamic";

type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: "SUPER_ADMIN" | "EDITOR";
  createdAt: Date;
};

const INPUT_CLASS =
  "block w-full rounded-xl border border-border-strong bg-surface px-4 text-sm text-foreground placeholder:text-subtle shadow-[inset_0_1px_2px_rgb(48_30_18_/_0.04)] transition-colors outline-none hover:border-ember-300 dark:hover:border-ember-500/70 focus-visible:border-ember-400 focus-visible:ring-2 focus-visible:ring-ember-400/30";

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export default async function UsersPage() {
  const currentUser = await requireRole("SUPER_ADMIN");

  const users: AdminUserRow[] = await db.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const superAdminCount = users.filter((u) => u.role === "SUPER_ADMIN").length;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
          <span className="rule-ember" />
          Access control
        </span>
        <h1 className="font-display text-4xl font-medium tracking-tight text-foreground">
          Admin users
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Create and manage back-office accounts. Actions are recorded in the audit log.
        </p>
      </header>

      <Card variant="default">
        <CardHeader>
          <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
            Create user
          </h2>
          <p className="text-xs text-muted">
            Editors can manage content. Super admins can also manage settings and users.
          </p>
        </CardHeader>
        <CardBody>
          <form action={createAdminUser} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label
                className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
                htmlFor="new-email"
              >
                Email
              </label>
              <Input
                id="new-email"
                type="email"
                name="email"
                required
                autoComplete="off"
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <label
                className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
                htmlFor="new-name"
              >
                Name (optional)
              </label>
              <Input id="new-name" type="text" name="name" autoComplete="off" className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <label
                className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
                htmlFor="new-password"
              >
                Password (min 8 chars)
              </label>
              <Input
                id="new-password"
                type="password"
                name="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1.5"
              />
            </div>
            <div>
              <label
                className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
                htmlFor="new-role"
              >
                Role
              </label>
              <select
                id="new-role"
                name="role"
                defaultValue="EDITOR"
                className={cn(INPUT_CLASS, "mt-1.5 h-11")}
              >
                <option value="EDITOR">EDITOR</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" size="md" className="w-full">
                Create
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card variant="default" className="overflow-hidden">
        <CardHeader>
          <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
            Existing users{" "}
            <span className="ml-1 text-sm font-normal text-muted tabular-nums">
              ({users.length})
            </span>
          </h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-2">
              <tr className="text-left text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted">
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Password</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                const isLastSuperAdmin = u.role === "SUPER_ADMIN" && superAdminCount <= 1;
                return (
                  <tr key={u.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-foreground">{u.email}</span>
                      {isSelf ? (
                        <Badge variant="subtle" size="sm" className="ml-2">
                          you
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5 text-muted">{u.name ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <form action={changeAdminUserRole} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={u.id} />
                        <select
                          name="role"
                          defaultValue={u.role}
                          disabled={isLastSuperAdmin}
                          aria-label={`Role for ${u.email}`}
                          className={cn(
                            INPUT_CLASS,
                            "h-9 max-w-[10rem] px-3 text-xs",
                            "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-70",
                          )}
                        >
                          <option value="EDITOR">EDITOR</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          disabled={isLastSuperAdmin}
                        >
                          Update
                        </Button>
                      </form>
                    </td>
                    <td className="px-5 py-3.5">
                      <form action={changeAdminUserPassword} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={u.id} />
                        <input
                          type="password"
                          name="password"
                          minLength={8}
                          required
                          autoComplete="new-password"
                          placeholder="New password"
                          aria-label={`New password for ${u.email}`}
                          className={cn(INPUT_CLASS, "h-9 max-w-[10rem] px-3 text-xs")}
                        />
                        <Button type="submit" variant="outline" size="sm">
                          Set
                        </Button>
                      </form>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <form action={deleteAdminUser} className="inline">
                        <input type="hidden" name="id" value={u.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          disabled={isSelf || isLastSuperAdmin}
                          title={
                            isSelf
                              ? "You cannot delete your own account"
                              : isLastSuperAdmin
                                ? "Cannot delete the last SUPER_ADMIN"
                                : "Delete user"
                          }
                          className="text-danger-600 hover:bg-danger-50 dark:text-danger-50 dark:hover:bg-danger-600/20 disabled:text-muted"
                        >
                          Delete
                        </Button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
