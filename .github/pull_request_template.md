# Summary

<!-- 1-3 sentences: what does this PR change and why? -->

## Type

- [ ] feat — new feature
- [ ] fix — bug fix
- [ ] refactor — code cleanup, no behaviour change
- [ ] docs — documentation only
- [ ] chore — tooling, deps, config
- [ ] ops — infra, CI, deploy

## Test plan

<!-- How did you verify this works? Check off + add notes. -->

- [ ] Local `pnpm typecheck` passes
- [ ] Local `pnpm test` passes
- [ ] Tested on `staging.knackcook.com` (URL of the PR preview)
- [ ] Browser-tested critical user flows (home, blog, product, admin)
- [ ] Edge cases considered (dark mode, mobile, empty state, error state)

## Amazon compliance (AGENTS.md §2)

<!-- Required for any PR touching products, prices, reviews, or images. Skip if N/A. -->

- [ ] N/A — this PR does not touch product/price/review/image surfaces
- [ ] No Amazon display price shown
- [ ] No Amazon review/rating copied
- [ ] No Amazon product image hosted
- [ ] No Schema.org `AggregateRating` from Amazon data

## Deploy notes

<!-- Any migration, env var, or manual step required? -->

- [ ] No schema change
- [ ] Schema change — migration created via `pnpm prisma migrate dev`
- [ ] New env var needed — added to `.env.example` and `.env.staging.example`
- [ ] Manual step on VPS required (describe below)

<!--
Examples of manual steps:
- Run `prisma migrate deploy` after pull
- Restart specific service
- Update Cloudflare cache rule
-->

## Screenshots / GIFs

<!-- For UI changes, drag in before/after. Highly recommended for any visible change. -->
