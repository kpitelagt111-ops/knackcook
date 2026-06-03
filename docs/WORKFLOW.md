# Development workflow

## Branches

```
main      ──►  https://knackcook.com   (prod, always green)
staging   ──►  https://staging.knackcook.com   (test before prod)
feature/* ──►  PRs only, no deploy
```

- **Never push directly to `main`** (branch protection blocks it).
- **Never push directly to `staging`** — go through a PR so CI runs.
- Feature branches always start from `main`.

## Loop for a new feature / fix

```bash
# 1. Sync local
git checkout main
git pull origin main

# 2. Create branch
git checkout -b feature/add-fr-locale

# 3. Code + commit (small focused commits)
git add -A
git commit -m "feat(i18n): scaffold French locale"

# 4. Push + open PR against `staging`
git push -u origin feature/add-fr-locale
gh pr create --base staging --fill   # or use GitHub UI

# 5. CI must pass (quality + e2e). Fix anything red.

# 6. Merge into staging (squash recommended).
#    → Auto-deploy to staging.knackcook.com (manual SSH pull for now;
#       see "Auto-deploy" below).

# 7. Click around staging.knackcook.com. Test the change end-to-end.

# 8. If happy, open PR `staging` → `main`.
#    → CI runs again on the merge commit.

# 9. Merge into main → deploy to knackcook.com.
```

## Branch protection (set once on GitHub)

GitHub → repo → **Settings → Branches → Add rule**.

For `main` AND `staging`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Required checks: `Lint + typecheck + Vitest`, `E2E Playwright (45 tests)`
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings

Effect:
- Direct `git push origin main` → rejected by GitHub.
- A red CI → merge button greyed out.
- Forces the workflow above.

## CI

`.github/workflows/ci.yml` runs on every PR + push to `main` and `staging`.

Jobs:
| Job | Runtime | What it does |
|---|---|---|
| `quality` | ~3 min | TypeScript typecheck + Biome lint + Vitest unit/integration |
| `e2e` | ~6-8 min | Real Postgres+Redis+Meili services, build, seed, then Playwright (45 tests) |

If CI is red on a PR, **fix locally first** before pushing again:

```bash
pnpm typecheck
pnpm lint
pnpm test           # vitest
pnpm test:e2e       # playwright (needs services up)
```

## Manual deploy commands (until auto-deploy is wired)

**Prod** (after merging into `main`):

```bash
ssh -i ~/.ssh/knackcook deploy@2.24.131.142
cd /home/deploy/knackcook
git pull origin main
docker compose build app && docker compose up -d app
# If schema changed:
docker compose exec app prisma migrate deploy
```

**Staging** (after merging into `staging`):

```bash
ssh -i ~/.ssh/knackcook deploy@2.24.131.142
cd /home/deploy/knackcook-staging
git pull origin staging
docker compose -f docker-compose.staging.yml -p knackcook-staging build app
docker compose -f docker-compose.staging.yml -p knackcook-staging up -d app
```

## Auto-deploy (next step, not yet wired)

To eliminate the manual SSH step, add a `deploy.yml` workflow that triggers on
push to `main` / `staging` and SSHes to the VPS to run the same commands.
Requires a `DEPLOY_SSH_KEY` secret in GitHub repo settings.

Track: see `docs/PLAN_IMPLEMENTATION.md` Phase 7+.
