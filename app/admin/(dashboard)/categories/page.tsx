import { Button, Card, CardBody, CardHeader, cn, Input } from "@/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { createCategory, deleteCategory, renameCategory, reorderCategory } from "./actions";

export default async function AdminCategoriesPage() {
  await requireRole("EDITOR");

  const categories = await db.category.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      order: true,
      translations: { where: { locale: "en" }, select: { name: true }, take: 1 },
      _count: { select: { products: true } },
    },
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
          <span className="rule-ember" />
          Taxonomy
        </span>
        <h1 className="font-display text-4xl font-medium tracking-tight text-foreground">
          Categories
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          <span className="font-medium text-foreground tabular-nums">{categories.length}</span>{" "}
          total · used for navigation, placeholders, and product grouping.
        </p>
      </header>

      <Card variant="default">
        <CardHeader>
          <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
            Create category
          </h2>
          <p className="text-xs text-muted">English name and kebab-case slug.</p>
        </CardHeader>
        <CardBody>
          <form
            action={createCategory}
            className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <div>
              <label
                htmlFor="new-name"
                className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
              >
                Name (English)
              </label>
              <Input
                id="new-name"
                name="name"
                required
                maxLength={120}
                placeholder="Chef Knives"
                className="mt-1.5"
              />
            </div>
            <div>
              <label
                htmlFor="new-slug"
                className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
              >
                Slug
              </label>
              <Input
                id="new-slug"
                name="slug"
                required
                maxLength={120}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                placeholder="chef-knives"
                className="mt-1.5 font-mono"
              />
            </div>
            <Button type="submit" size="md">
              Create
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-2">
              <tr className="text-left text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted">
                <th className="px-5 py-3.5">Order</th>
                <th className="px-5 py-3.5">Name (en) &amp; slug</th>
                <th className="px-5 py-3.5 text-right">Products</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted">
                    No categories yet.
                  </td>
                </tr>
              ) : (
                categories.map((c, idx) => (
                  <tr key={c.id} className="align-top transition-colors hover:bg-surface-2/60">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 text-center font-mono text-xs text-muted">
                          {c.order}
                        </span>
                        <form action={reorderCategory}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button
                            type="submit"
                            disabled={idx === 0}
                            aria-label="Move up"
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-lg border border-border-strong bg-surface text-sm transition-colors",
                              "hover:border-ember-300 dark:hover:border-ember-500/70 hover:text-ember-600 dark:hover:text-ember-300",
                              "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:text-inherit",
                            )}
                          >
                            ↑
                          </button>
                        </form>
                        <form action={reorderCategory}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            type="submit"
                            disabled={idx === categories.length - 1}
                            aria-label="Move down"
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-lg border border-border-strong bg-surface text-sm transition-colors",
                              "hover:border-ember-300 dark:hover:border-ember-500/70 hover:text-ember-600 dark:hover:text-ember-300",
                              "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:text-inherit",
                            )}
                          >
                            ↓
                          </button>
                        </form>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <form
                        action={renameCategory}
                        className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
                      >
                        <input type="hidden" name="id" value={c.id} />
                        <Input
                          name="name"
                          defaultValue={c.translations[0]?.name ?? ""}
                          required
                          maxLength={120}
                          inputSize="sm"
                        />
                        <Input
                          name="slug"
                          defaultValue={c.slug}
                          required
                          maxLength={120}
                          pattern="[a-z0-9]+(-[a-z0-9]+)*"
                          inputSize="sm"
                          className="font-mono text-xs"
                        />
                        <Button type="submit" size="sm">
                          Save
                        </Button>
                      </form>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-xs tabular-nums text-muted">
                      {c._count.products}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <form action={deleteCategory}>
                        <input type="hidden" name="id" value={c.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          disabled={c._count.products > 0}
                          title={
                            c._count.products > 0
                              ? "Reassign or remove products first."
                              : "Delete this category"
                          }
                          className="text-danger-600 hover:bg-danger-50 dark:text-danger-50 dark:hover:bg-danger-600/20 disabled:text-muted"
                        >
                          Delete
                        </Button>
                      </form>
                    </td>
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
